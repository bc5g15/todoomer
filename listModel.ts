let editingText = false;

const promiseText = (defaultString = ''): [HTMLElement, Promise<string>, () => void] => {
    // Create a special text form and add myself to the root
    const magicForm = document.createElement('form');
    magicForm.method = 'dialog';
    const textInput = document.createElement('input');
    textInput.className = 'dynamicText';
    magicForm.append(textInput);
    textInput.value = defaultString;
    editingText = true;

    const p = new Promise<string>(res => {
        const submit = (ev: SubmitEvent | FocusEvent) => {
            ev.preventDefault();
            editingText = false;
            const textResult = textInput.value || defaultString;
            res(textResult);
        }
        magicForm.onsubmit = submit;
        textInput.onblur = submit;
    })

    return [magicForm, p, () => {textInput.focus(); textInput.select()}];
}

const promiseTextButton = (handleText: (s: string) => void) => {
    const btn = document.createElement('button');
    btn.textContent = '+';
    btn.onclick = async () => {
        const [form, promise, focus] = promiseText('New Node');
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
        const [form, promise, focus] = await promiseText(textValue);
        para.replaceWith(form);
        focus();
        const result = await promise;
        handleText(result);
        para.innerText = result;
        form.replaceWith(para);
    }
    return para;
}

// const promiseColourPicker = (defaultValue?: string) => {
//     const input = document.createElement('input');
//     input.type = 'color';
//     input.value = defaultValue ?? '';
//     input.onchange = 
// }

type NodeValue = {
    text: string;
    colour?: string;
    folded?: boolean; 
};

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
    dragZone.ondragenter = (ev) => {
        ev.preventDefault();
        dragZone.classList.add('dropZoneSelected')
    }
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

let selectedNode: Address | undefined = undefined; 
document.body.onclick = (ev) => {
    ev.stopPropagation();
    selectedNode = undefined;
    const classes = document.getElementsByClassName('selectedNode');
    if (classes.length) {
        classes[0].classList.remove('selectedNode');
    }
}

document.onkeyup = (ev) => {
    if (!editingText && ev.code === 'Delete') {
        if (selectedNode) {
            removeAtAddress(currentModel, selectedNode);
            update();
        }
    }
}

const DEFAULT_COLOUR = '#3c5375';
const DEFAULT_LEAF_COLOUR = '#000000';


const calculateTextColour = (backgroundColour: string) => {
    const parseHex = (startIndex: number, endIndex: number) => {
        return parseInt(backgroundColour.slice(startIndex, endIndex), 16);
    }    
    const r = parseHex(1, 3);
    const g = parseHex(3, 5);
    const b = parseHex(5, 7);
    // Stole these numbers from a stack overflow answer: 
    // https://stackoverflow.com/questions/3942878/how-to-decide-font-color-in-white-or-black-depending-on-background-color
    return (r*0.299+g*0.587+b*0.114) > 186 ? '#000000' : '#FFFFFF'
}

const foldButton = (defaultValue: boolean, onFold: (value: boolean) => void) => {
    const foldElem = document.createElement('div');
    foldElem.classList.add('foldButton');
    let value = defaultValue;
    foldElem.innerText = value ? '>' : 'V';
    foldElem.onclick = () => {
        value = !value;
        foldElem.innerText = value ? '>' : 'V';
        onFold(value);
    }
    return foldElem;
}

const createNodeElement = (node: Node, address: Address): HTMLElement => {
    const { text, colour, folded } = node.value ?? {};
    const root = document.createElement('div');
    root.style.backgroundColor = colour ?? DEFAULT_COLOUR;
    root.style.color = calculateTextColour(root.style.backgroundColor);
    root.classList.add('selectableNode');
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
    root.ondragend = () => {
        const dropZones = document.getElementsByClassName('dropZone');
        for (let i = 0; i < dropZones.length; i++) {
            dropZones[i].classList.remove('dropZonePotential');
            dropZones[i].classList.remove('dropZoneSelected');
        }
    };
    // Make the root selectable
    root.onclick = (ev) => {
        ev.stopPropagation();
        const classes = document.getElementsByClassName('selectedNode');
        if (classes.length) {
            classes[0].classList.remove('selectedNode');
        }
        root.classList.add('selectedNode');
        selectedNode = address;
    }

    // Add the delete button to the top-right of the root node
    const controlTray = document.createElement('div');
    controlTray.classList.add('controlTray');
    root.append(controlTray);
    const delButton = document.createElement('button');
    delButton.classList.add('deleteButton');
    delButton.textContent = 'X'
    delButton.onclick = () => {
        removeAtAddress(currentModel, address);
        update();
    }

    const colourButton = document.createElement('input');
    colourButton.type = 'color';
    colourButton.value = colour ?? root.style.backgroundColor ?? DEFAULT_COLOUR;
    colourButton.onchange = () => {
        root.style.backgroundColor = colourButton.value;
        node.value.colour = colourButton.value;
        root.style.color = calculateTextColour(colourButton.value);
    }
    controlTray.append(colourButton);
    controlTray.append(delButton);

    const titleTextContainer = document.createElement('div');
    titleTextContainer.style.display = 'flex';
    root.append(titleTextContainer);

    const message = promiseTextDisplay((text ?? ''), (s) => {
        node.value = {
            ...node.value,
            text: s
        }
        update();
    })
    titleTextContainer.appendChild(message)

    // The function for adding a new element to the column, we'll need it below!
    const addElement = (text: string) => {
        appendItem(node, {
            value: { text },
            contents: {startType: true, next: undefined}
        });
        update();
    }
    if (node.contents.next === undefined) {
        root.classList.add('leaf');
        // Leaf node, create drag zone that would turn this into a branch
        if (!colour) {
            root.style.backgroundColor = DEFAULT_LEAF_COLOUR;
        }
        const dragZone = createDragZone([...address, 0]);
        dragZone.style.height = '1em';
        const leafAddButton = promiseTextButton(addElement);
        leafAddButton.classList.add('showOnSelected');
        root.append(leafAddButton);
        root.append(dragZone);
        return root;
    }
    
    root.classList.add('branch');

    // If we're not a leaf, add the option to fold in this block. 
    const toggleFold = (value: boolean) => {
        node.value.folded = value;
        update();
    }
    const toggleFoldButton = foldButton(folded ?? false, toggleFold);
    titleTextContainer.append(toggleFoldButton);
    if (folded) {
        // No need to show any of the contents if we're folded. 
        return root;
    }

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

    
    const elementAddButton = promiseTextButton(addElement);
    root.append(elementAddButton);
    return root;
}

const buildView = (model: Node) => {
    // We don't care about the top level value, it is always just going to be for the children
    const rootDiv = document.createElement('div');
    rootDiv.className = 'root';

    const addColumn = (text: string) => {
        // Make it a column with a default box inside of it. 
        // Top level boxes are kinda weird
        appendItem(model, {
            value: { text },
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
        // Except add the add column button! 
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

        const topColumn = createNodeElement(current.value, [i])
        topColumn.classList.add('topColumn')
        rootDiv.append(topColumn)
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
