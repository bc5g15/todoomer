// type Item = Column | {
//     value: string
// }

// type Column = {
//     name: string;
//     contents: Item[];
// }

type NodeValue = string | undefined

type Node = {
    value: NodeValue;
    contents: LinkedList<Node> | undefined;
}

// type Model = Node[];

type Address = number[];

type LinkedList<a> = {
    value: a;
    next: LinkedList<a> | undefined;
} 

const model: Node = {
    value: undefined,
    contents: undefined
};

const findByIndex = <a>(lst: LinkedList<a>, index: number) => {
    let r = lst;
    while (index > 0) {
        index--;
        if (!r.next) return undefined;
        r = r.next;
    }
    return r.value;
}

const removeAt = <a>(lst: LinkedList<a>, index: number) => {
    let r = lst; 
    while (index > 1) {
        index--;
        if (!r.next) return;
        r = r.next;
    }
    r.next = r.next?.next ?? undefined;
}

const insertAt = <a>(lst: LinkedList<a>, index: number, item: a) => {
    let r = lst; 
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
    let r = node.contents;
    if (r === undefined) {
        node.contents = {
            value: item,
            next: undefined
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
    if (address.length === 0 || mdl.contents === undefined) {
        return mdl; 
    }
    let node: Node|undefined = findByIndex(mdl.contents, address.unshift())
    while (address.length > 0) {
        if (!node || node.contents === undefined) return undefined; // Bad Address
        const add = address.unshift();
        node = findByIndex(node.contents, add);
    }
    return node;
}

// const findContentsByAddress = (mdl: Model, address: Address): Node[] | undefined => {
//     if (address.length === 0) {
//         return mdl; 
//     }
//     let node: Node = mdl[address.shift()!];
//     while (address.length > 0) {
//         const add = address.unshift();
//         node = node.contents[add];
//         if (!node) return undefined; // Bad Address
//     }
//     return node.contents;
// }

const removeAtAddress = (mdl: Node, address: Address) => {
    const parent = address.slice(0, -1);
    const index = address[address.length-1];
    const n = findByAddress(mdl, parent);
    if (!n) return;
    if (!n.contents) return;
    removeAt(n.contents, index);
}

const appendAtAddress = (mdl: Node, address: Address, value: string) => {
    const n = findByAddress(mdl, address);
    if (!n) return; // Bad address
    appendItem(n, { value, contents: undefined});
}

const addAt = (mdl: Node, address: Address, node: Node) => {
    const parent = address.slice(0, -1);
    const index = address[address.length-1];
    const n = findByAddress(mdl, parent);
    if (!n) return;
    if (!n.contents) {
        n.contents = {
            value: node,
            next: undefined
        };
        return;
    }
    insertAt(n.contents, index, node);
}

const onMove = (mdl: Node, start: Address, destination: Address) => {
    const n = findByAddress(mdl, start);
    if (!n) return; // Bad address
    removeAtAddress(mdl, start);
    addAt(mdl, destination, n);
}

// const onAddColumn = (mdl: Model, name: string) => {
//     mdl.push({
//         name,
//         contents: []
//     });
// }

// const onAddItem = (mdl: Model, name: string, item: Item) => {
//     const column = mdl.find(c => c.name === name);
//     if (!column) { 
//         return;
//     }
//     column.contents.push(item);
// }

// const onMoveItem = (mdl: Model, startName: string, startIndex: )

const root = document.body;

const createNodeElement = (node: Node, address: Address): HTMLElement => {
    const root = document.createElement('div');
    const message = document.createElement('p');
    message.innerText = (node.value ?? '') + address.join('/');
    root.appendChild(message)
    if (node.contents === undefined) {
        root.className = 'leaf';
        // Leaf node, nothing more needs be done
        return root;
    }
    root.className = 'branch';
    const container = document.createElement('div');
    let i = 0;
    let n: LinkedList<Node> | undefined = node.contents;
    do {
        const child = createNodeElement(n.value, [...address, i])
        container.append(child);
        i++;
        n = n.next;
    } while (n !== undefined);
    root.append(container);
    return root;
}

const buildView = (root: HTMLElement, model: Node) => {
    // We don't care about the top level value, it is always just going to be for the children
    const rootDiv = document.createElement('div');
    rootDiv.className = 'root';
    const children = model.contents;
    if (children === undefined) {
        // No children, can't do anything
        return;
    }

    let i = 0;
    let current: LinkedList<Node> | undefined = children;
    do {
        rootDiv.append(createNodeElement(current.value, [i]))
        current = current.next;
        i++;
    } while (current !== undefined)
    root.append(rootDiv);
};

const testModel: Node = {
    value: undefined,
    contents: {
        value: {
            value: 'First Column',
            contents: {
                value: {
                    value: 'First Leaf',
                    contents: undefined
                },
                next: undefined
            }
        },
        next: {
                    value: {
                        value: 'Second Column',
                        contents: {
                            value: {
                                value: 'Second Node',
                                contents: {
                                    value: {
                                        value: 'Inner Node',
                                        contents: undefined
                                    },
                                    next: {
                                        value: {
                                            value: 'Second Inner Node',
                                            contents: undefined
                                        },
                                        next: undefined
                                    }
                                }
                            },
                            next: undefined
                        }
                    },
                    next: undefined
                }
    }
}

buildView(document.body, testModel);