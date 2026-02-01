class MagnodeNode extends NodeBase {
    constructor(id, x, y, options) {
        super(id, 'magnode', x, y, { ...options, allowSplit: false });
        this.inputCount = 2;
        this.activeIndex = 0;
        console.log(`[MagnodeNode.constructor] Created magnode ${id} with inputCount: ${this.inputCount}, activeIndex: ${this.activeIndex}`);
    }
    
    getText(context) {
        console.log(`[MagnodeNode.getText] START - Node ${this.id}`);
        console.log(`[MagnodeNode.getText] Current activeIndex: ${this.activeIndex}`);
        console.log(`[MagnodeNode.getText] Context:`, {
            skipCycling: context.skipCycling,
            skipMagnodeChain: context.skipMagnodeChain,
            magnodesToCycle: context.magnodesToCycle
        });
        
        const inputs = context.connectionManager.getMagnodeInputs(this.id);
        console.log(`[MagnodeNode.getText] All inputs:`, inputs);
        console.log(`[MagnodeNode.getText] Input count: ${this.inputCount}`);
        
        const activeIndex = this.activeIndex || 0;
        console.log(`[MagnodeNode.getText] Using activeIndex: ${activeIndex}`);
        console.log(`[MagnodeNode.getText] inputs[${activeIndex}]:`, inputs[activeIndex]);
        
        if (!inputs[activeIndex]?.length) {
            console.log(`[MagnodeNode.getText] No input at activeIndex ${activeIndex}, returning empty`);
            return '';
        }
        
        const sourceNodeId = inputs[activeIndex][0];
        console.log(`[MagnodeNode.getText] Source node ID: ${sourceNodeId}`);
        const sourceNode = context.nodeManager.find(sourceNodeId);
        console.log(`[MagnodeNode.getText] Source node found:`, sourceNode ? {id: sourceNode.id, text: sourceNode.text?.substring(0, 50)} : 'NOT FOUND');
        
        if (!sourceNode) {
            console.log(`[MagnodeNode.getText] Source node not found, returning empty`);
            return '';
        }
        
        const hasIncoming = context.connectionManager.hasIncoming(this.id);
        const isInChain = context.magnodesToCycle !== null;
        console.log(`[MagnodeNode.getText] hasIncoming: ${hasIncoming}, isInChain: ${isInChain}`);
        
        if (hasIncoming || isInChain) {
            console.log(`[MagnodeNode.getText] Using chain context - returning active input text`);
            if (context.magnodesToCycle) {
                const wasInSet = context.magnodesToCycle.has(this.id);
                context.magnodesToCycle.add(this.id);
                console.log(`[MagnodeNode.getText] Added to magnodesToCycle (was already in set: ${wasInSet})`);
            }
            const result = this.normalize(sourceNode.text);
            console.log(`[MagnodeNode.getText] END - Returning normalized text: "${result.substring(0, 100)}..."`);
            return result;
        } else {
            console.log(`[MagnodeNode.getText] Using standalone context - building chain from source`);
            const chainText = context.textExtractor.getChainText(sourceNodeId, context);
            console.log(`[MagnodeNode.getText] Chain text result: "${chainText.substring(0, 100)}..."`);
            if (!context.skipCycling && this.inputCount > 1) {
                const oldIndex = this.activeIndex;
                this.activeIndex = (activeIndex + 1) % this.inputCount;
                console.log(`[MagnodeNode.getText] Cycled activeIndex from ${oldIndex} to ${this.activeIndex}`);
            }
            console.log(`[MagnodeNode.getText] END - Returning chain text`);
            return chainText;
        }
    }
    
    cycle() {
        console.log(`[MagnodeNode.cycle] START - Node ${this.id}`);
        console.log(`[MagnodeNode.cycle] Current activeIndex: ${this.activeIndex}, inputCount: ${this.inputCount}`);
        if (this.inputCount > 1) {
            const oldIndex = this.activeIndex;
            this.activeIndex = ((this.activeIndex || 0) + 1) % this.inputCount;
            console.log(`[MagnodeNode.cycle] Cycled from ${oldIndex} to ${this.activeIndex}`);
        } else {
            console.log(`[MagnodeNode.cycle] Not cycling - only ${this.inputCount} input(s)`);
        }
        console.log(`[MagnodeNode.cycle] END - New activeIndex: ${this.activeIndex}`);
    }
}

