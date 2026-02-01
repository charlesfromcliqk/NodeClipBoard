class TripleNode extends NodeBase {
    constructor(id, x, y, options) {
        super(id, 'triple', x, y, { ...options, allowSplit: false });
        this.skipIndex = 0;
        console.log(`[TripleNode.constructor] Created triple node ${id} with skipIndex: ${this.skipIndex}`);
    }
    
    getText(context) {
        console.log(`[TripleNode.getText] START - Node ${this.id}, skipIndex: ${this.skipIndex}, skipCycling: ${context.skipCycling}`);
        const inputs = context.connectionManager.getNodeInputs(this.id);
        console.log(`[TripleNode.getText] Node ${this.id} inputs:`, inputs);
        const texts = [];
        for (let i = 0; i < 3; i++) {
            console.log(`[TripleNode.getText] Checking input ${i}: skipIndex=${this.skipIndex}, hasInput=${inputs[i]?.length > 0}`);
            if (i !== this.skipIndex && inputs[i]?.length > 0) {
                const sourceNode = context.nodeManager.find(inputs[i][0]);
                console.log(`[TripleNode.getText] Input ${i} source node:`, sourceNode?.id, sourceNode?.text);
                if (sourceNode) {
                    const normalized = this.normalize(sourceNode.text);
                    texts.push(normalized);
                    console.log(`[TripleNode.getText] Added text from input ${i}: "${normalized}"`);
                }
            }
        }
        if (!context.skipCycling) {
            const oldSkipIndex = this.skipIndex;
            this.skipIndex = (this.skipIndex + 1) % 3;
            console.log(`[TripleNode.getText] Cycled skipIndex from ${oldSkipIndex} to ${this.skipIndex}`);
        }
        const result = texts.join('\n');
        console.log(`[TripleNode.getText] END - Node ${this.id} returning: "${result}"`);
        return result;
    }
}

