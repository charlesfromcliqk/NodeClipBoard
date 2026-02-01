class InstanceNode extends NodeBase {
    constructor(id, x, y, options) {
        super(id, 'instance', x, y, { ...options, allowSplit: false });
        this.inputCount = 2;
        console.log(`[InstanceNode.constructor] Created instance node ${id}`);
    }
    
    getText(context) {
        console.log(`[InstanceNode.getText] START - Node ${this.id}`);
        const inputs = context.connectionManager.getInstanceInputs(this.id);
        console.log(`[InstanceNode.getText] Inputs:`, inputs);
        console.log(`[InstanceNode.getText] Content reference input (1):`, inputs[1]);
        
        if (!inputs[1]?.length) {
            console.log(`[InstanceNode.getText] No content reference, returning empty`);
            return '';
        }
        
        const sourceNode = context.nodeManager.find(inputs[1][0]);
        console.log(`[InstanceNode.getText] Source node:`, sourceNode ? {id: sourceNode.id, type: sourceNode.type} : 'NOT FOUND');
        
        if (!sourceNode) {
            console.log(`[InstanceNode.getText] Source node not found, returning empty`);
            return '';
        }
        
        if (sourceNode.type === 'magnode') {
            console.log(`[InstanceNode.getText] Source is magnode, getting active input`);
            const magnodeInputs = context.connectionManager.getMagnodeInputs(sourceNode.id);
            const activeIndex = sourceNode.activeIndex || 0;
            console.log(`[InstanceNode.getText] Magnode activeIndex: ${activeIndex}, inputs:`, magnodeInputs);
            
            if (magnodeInputs[activeIndex]?.length > 0) {
                const activeInputNode = context.nodeManager.find(magnodeInputs[activeIndex][0]);
                console.log(`[InstanceNode.getText] Active input node:`, activeInputNode ? {id: activeInputNode.id} : 'NOT FOUND');
                if (activeInputNode) {
                    if (context.magnodesToCycle) {
                        context.magnodesToCycle.add(sourceNode.id);
                        console.log(`[InstanceNode.getText] Added magnode ${sourceNode.id} to cycle set`);
                    }
                    const text = this.normalize(activeInputNode.text);
                    console.log(`[InstanceNode.getText] Returning text from active input:`, text?.substring(0, 50));
                    return text;
                }
            }
            console.log(`[InstanceNode.getText] No active input found, returning empty`);
            return '';
        }
        const text = this.normalize(sourceNode.text);
        console.log(`[InstanceNode.getText] Returning text from source:`, text?.substring(0, 50));
        return text;
    }
}

