class NodeBase {
    constructor(id, type, x, y, options = {}) {
        console.log(`[NodeBase.constructor] Creating ${type} node with id: ${id}`);
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.text = options.text || '';
        this.copyCount = 0;
        this.title = options.title || '';
        this.allowSplit = options.allowSplit !== undefined ? options.allowSplit : true;
    }
    
    getText(context) {
        console.log(`[NodeBase.getText] Node ${this.id} (${this.type}) - text: "${this.text}"`);
        const result = this.normalize(this.text);
        console.log(`[NodeBase.getText] Node ${this.id} returning: "${result}"`);
        return result;
    }
    
    normalize(text) {
        return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
}

