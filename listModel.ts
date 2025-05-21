const promiseText = (defaultString = ''): [HTMLElement, Promise<string>, () => void] => {
    // Create a special text form and add myself to the root
    const magicForm = document.createElement('form');
    const textInput = document.createElement('input');
    textInput.className = 'dynamicText';
    magicForm.append(textInput);
    textInput.value = defaultString;

    const p = new Promise<string>(res => {
        const submit = () => {
            const textResult = textInput.value;
            res(textResult);
        }
        magicForm.onsubmit = submit;
        textInput.onblur = submit;
    })

    return [magicForm, p, () => textInput.focus()];
}

const promiseTextButton = (handleText: (s: string) => void) => {
    const btn = document.createElement('button');
    btn.textContent = '+';
    btn.onclick = async () => {
        const [form, promise, focus] = promiseText();
        btn.replaceWith(form);
        focus();
        const result = await promise;
        handleText(result);
        form.replaceWith(btn);
    }
    return btn;
}

const promiseTextDisplay = (textValue: string, handleText: (s: string) => void) => {
    const para = document.createElement('p');
    para.innerText = textValue;
    para.className = 'editableText';
    para.onclick = async () => {
        const [form, promise, focus] = await promiseText();
        para.replaceWith(form);
        focus();
        const result = await promise;
        handleText(result);
        para.innerText = result;
        form.replaceWith(para);
    }
    return para;
}

type NodeValue = string | undefined

type Node = {
    value: NodeValue;
    contents: StartNode<Node>;
}

type Address = number[];

type StartNode<a> = {
    startType: true;
    next: LinkedList<a> | undefined;
}

type LinkedList<a> = {
    value: a;
    next: LinkedList<a> | undefined;
} 

type ListItem<a> = LinkedList<a> | StartNode<a>

const findByIndex = <a>(lst: StartNode<a>, index: number) => {
    let r = lst.next;
    if (!r) return undefined;
    while (index > 0) {
        index--;
        if (!r?.next) return undefined;
        r = r.next;
    }
    return r.value;
}

const removeAt = <a>(lst: StartNode<a>, index: number) => {
    let r: ListItem<a> = lst; 
    while (index > 0) {
        index--;
        if (!r.next) return;
        r = r.next;
    }
    r.next = r.next?.next ?? undefined;
}

const insertAt = <a>(lst: StartNode<a>, index: number, item: a) => {
    let r: ListItem<a> = lst; 
    while (index > 0) {
        index--;
        if (!r.next) {
            r.next = {
                value: item,
                next: undefined
            };
            return;
        }
        r = r.next;
    }
    const oldNext = r.next;
    r.next = {
        value: item,
        next: oldNext
    }
}

const appendItem = (node: Node, item: Node) => {
    let r: ListItem<Node> = node.contents;
    if (r === undefined) {
        node.contents = {
            startType: true,
            next: {
                value: item,
                next: undefined
            }
        }
        return;
    }

    while (r.next !== undefined) {
        r = r.next;
    }
    r.next = {
        value: item,
        next: undefined
    };
}

const findByAddress = (mdl: Node, address: Address): Node | undefined => {
    if (address.length < 1 || mdl.contents === undefined) {
        return mdl; 
    }
    const addressCopy = [...address];
    let node: Node|undefined = findByIndex(mdl.contents, addressCopy.shift()!)
    while (addressCopy.length > 0) {
        if (!node || node.contents === undefined) return undefined; // Bad Address
        const add = addressCopy.shift()!;
        node = findByIndex(node.contents, add);
    }
    return node;
}

const removeAtAddress = (mdl: Node, address: Address) => {
    const parent = address.slice(0, -1);
    const index = address[address.length-1];
    const n = findByAddress(mdl, parent);
    if (!n) return;
    removeAt(n.contents, index);
}

const addAt = (mdl: Node, address: Address, node: Node) => {
    const parent = address.slice(0, -1);
    const index = address[address.length-1];
    const n = findByAddress(mdl, parent);
    if (!n) return;
    insertAt(n.contents, index, node);
}

const compareAddress = (add1: Address, add2: Address) => {
    const a1 = [...add1];
    const a2 = [...add2];
    console.log(a1, a2);
    while (true) {
        let a = a1.shift();
        let b = a2.shift();
        if (a === undefined && b === undefined) {
            return 0;
        }
        if (a === undefined) {
            return 1
        }
        if (b === undefined) {
            return -1
        }
        if (a === b) continue;
        if (a < b) {
            return 1;
        }
        if (a > b) {
            return -1;
        }
        return 0;
    }
}

const isContainedBy = (start: Address, destination: Address) => {
    const alst = [...start];
    const blst = [...destination];
    while (true) {
        const a = alst.shift();
        const b = blst.shift();
        if (a === undefined && b === undefined) {
            return true;
        }
        if (a === b) { 
            continue;
        }
        if (a === undefined) {
            // b is contained by A
            return true;
        }
        return false;
    }
}

const onMove = (mdl: Node, start: Address, destination: Address) => {
    const n = findByAddress(mdl, start);
    if (!n) return; // Bad address
    // The order of these operations depends on the cardinality of the addresses
    // Can't just do them in a fixed order! 
    // Or can I? 
    const r = compareAddress(start, destination);
    if (isContainedBy(start, destination)) {
        // One is inside the other, don't do anything!
        return;
    }
    console.log(r);
    if (r === 0) {
        // Addresses are the same, don't do anything!
        return;
    }
    if (r === -1) {
        removeAtAddress(mdl, start);
        addAt(mdl, destination, n);
    } else {
        addAt(mdl, destination, n);
        removeAtAddress(mdl, start);
    }
}

const MODEL_KEY = 'tmdr-model'

let currentRoot: HTMLElement | undefined = undefined;
let currentModel:Node = JSON.parse(localStorage.getItem(MODEL_KEY) ?? JSON.stringify({
    value: undefined,
    contents: {
        startType: true,
        next: undefined
    }
}));

let update = () => {
    if (currentRoot) {
        document.body.removeChild(currentRoot);
    }
    currentRoot = buildView(currentModel);
    if (currentRoot) {
        document.body.appendChild(currentRoot);
    }
    localStorage.setItem(MODEL_KEY, JSON.stringify(currentModel))
}

const createDragZone = (address: Address) => {
    const dragZone = document.createElement('div');
    dragZone.classList.add('dropZone');
    dragZone.style.outline = '1px dashed red';
    dragZone.ondragenter = (ev) => {
        ev.preventDefault();
        dragZone.classList.add('dropZoneSelected')
    }
    dragZone.ondragend = () => {
        const dropZones = document.getElementsByClassName('dropZone');
        for (let i = 0; i < dropZones.length; i++) {
            dropZones[i].classList.remove('dropZonePotential');
            dropZones[i].classList.remove('dropZoneSelected');
        }
    };
    dragZone.ondragleave = (ev) => {
        ev.preventDefault();
        dragZone.classList.remove('dropZoneSelected');
        dragZone.classList.add('dropZonePotential')
    }
    dragZone.ondragover = (ev) => {
        ev.preventDefault();
        ev.dataTransfer!.dropEffect = 'move';
    }
    dragZone.ondrop = (ev) => {
        const d = ev.dataTransfer?.getData('text/plain');
        if(!d) return;
        const startAddress: Address = JSON.parse(d);
        onMove(currentModel, startAddress, address);
        const dropZones = document.getElementsByClassName('dropZone');
        for (let i = 0; i < dropZones.length; i++) {
            dropZones[i].classList.remove('dropZonePotential');
            dropZones[i].classList.remove('dropZoneSelected');
        }
        update();
    }
    return dragZone;
} 

const createNodeElement = (node: Node, address: Address): HTMLElement => {
    const root = document.createElement('div');
    root.draggable = true;
    // Make the root draggable
    root.ondragstart = (ev) => {
        ev.stopPropagation();
        ev.dataTransfer?.setData('text/plain', JSON.stringify(address));
        const dropZones = document.getElementsByClassName('dropZone');
        for (let i = 0; i < dropZones.length; i++) {
            dropZones[i].classList.add('dropZonePotential');
        }
    }
    const message = promiseTextDisplay((node.value ?? '') + address.join('/'), (s) => {
        node.value = s;
    })
    // message.innerText = (node.value ?? '') + address.join('/');
    root.appendChild(message)
    if (node.contents.next === undefined) {
        root.className = 'leaf';
        // Leaf node, create drag zone that would turn this into a branch
        const dragZone = createDragZone([...address, 0]);
        dragZone.style.height = '1em';
        root.append(dragZone);
        return root;
    }
    root.className = 'branch';
    const container = document.createElement('div');
    let i = 0;
    let n: LinkedList<Node> | undefined = node.contents.next;
    do {
        const dragZone = createDragZone([...address, i]);
        dragZone.style.height = '1em';
        container.append(dragZone);
        const child = createNodeElement(n.value, [...address, i])
        container.append(child);
        i++;
        n = n.next;
    } while (n !== undefined);
    const dragZone = createDragZone([...address, i]);
    dragZone.style.height = '1em';
    container.append(dragZone);
    root.append(container);

    // Add a button for inserting a new element to this column! 
    const addElement = (s: string) => {
        appendItem(node, {
            value: s,
            contents: {startType: true, next: undefined}
        });
        update();
    }
    const elementAddButton = promiseTextButton(addElement);
    root.append(elementAddButton);
    return root;
}



const buildView = (model: Node) => {
    // We don't care about the top level value, it is always just going to be for the children
    const rootDiv = document.createElement('div');
    rootDiv.className = 'root';

    const addColumn = (s: string) => {
        // Make it a column with a default box inside of it. 
        // Top level boxes are kinda weird
        appendItem(model, {
            value: s,
            contents: {
                startType: true,
                next: undefined
            }
        });
        update();
    }

    const children = model.contents;
    if (children.next === undefined) {
        // No children, can't do anything
        // Except add the ending button! 
        const columnAddButton = promiseTextButton(addColumn);
        rootDiv.append(columnAddButton);
        return rootDiv;
    }

    let i = 0;
    let current: LinkedList<Node> | undefined = children.next;
    do {
        // Add drag zones for the elements... 
        const columnDragZone = createDragZone([i]);
        columnDragZone.style.width = '1em';
        rootDiv.append(columnDragZone);

        rootDiv.append(createNodeElement(current.value, [i]))
        current = current.next;
        i++;[1]
    } while (current !== undefined)

    const columnDragZone = createDragZone([i]);
    columnDragZone.style.width = '1em';
    rootDiv.append(columnDragZone);

    const columnAddButton = promiseTextButton(addColumn);
    rootDiv.append(columnAddButton);
    return rootDiv;
};

update();
