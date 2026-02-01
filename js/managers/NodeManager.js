class NodeManager {
    constructor() {
        this._nodes = []; // Use _nodes internally to work with getter/setter
    }
    
    get nodes() {
        return this._nodes || [];
    }
    
    set nodes(value) {
        this._nodes = value || [];
    }
    
    find(nodeId) {
        return this._nodes.find(n => n.id === nodeId);
    }
    
    create(type, x, y, options = {}) {
        console.log(`[NodeManager.create] Creating ${type} node at (${x}, ${y})`);
        const id = Date.now() + Math.random();
        const pos = { x: x ?? Math.random() * 400 + 50, y: y ?? Math.random() * 300 + 50 };
        
        let node;
        switch(type) {
            case 'triple': node = new TripleNode(id, pos.x, pos.y, options); break;
            case 'magnode': node = new MagnodeNode(id, pos.x, pos.y, options); break;
            case 'instance': node = new InstanceNode(id, pos.x, pos.y, options); break;
            default: node = new RegularNode(id, pos.x, pos.y, options);
        }
        
        this._nodes.push(node);
        console.log(`[NodeManager.create] Added node to manager, total nodes: ${this._nodes.length}`);
        return node;
    }
    
    add(node) {
        console.log(`[NodeManager.add] Adding node ${node.id} (${node.type})`);
        this._nodes.push(node);
        console.log(`[NodeManager.add] Total nodes: ${this._nodes.length}`);
    }
    
    remove(nodeId) {
        console.log(`[NodeManager.remove] Removing node ${nodeId}`);
        const before = this._nodes.length;
        const index = this._nodes.findIndex(n => n.id === nodeId);
        if (index !== -1) {
            this._nodes.splice(index, 1);
        }
        console.log(`[NodeManager.remove] Removed, nodes: ${before} -> ${this._nodes.length}`);
    }
}

