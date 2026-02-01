class TextExtractor {
    constructor(nodeManager, connectionManager) {
        this.nodeManager = nodeManager;
        this.connectionManager = connectionManager;
        console.log(`[TextExtractor.constructor] Created TextExtractor`);
    }
    
    getNodeText(nodeId, context) {
        console.log(`[TextExtractor.getNodeText] START - Node ${nodeId}`);
        const node = this.nodeManager.find(nodeId);
        if (!node) {
            console.log(`[TextExtractor.getNodeText] Node not found, returning empty`);
            return '';
        }
        console.log(`[TextExtractor.getNodeText] Node found:`, {id: node.id, type: node.type});
        const text = node.getText(context);
        console.log(`[TextExtractor.getNodeText] END - Returning text:`, text?.substring(0, 50));
        return text;
    }
    
    getChainText(startNodeId, context) {
        console.log(`[TextExtractor.getChainText] START - Building chain from ${startNodeId}`);
        const chainBuilder = new ChainBuilder(this.nodeManager, this.connectionManager);
        const chain = chainBuilder.buildFromNode(startNodeId);
        const texts = [];
        
        chain.forEach((chainNode, index) => {
            console.log(`[TextExtractor.getChainText] Processing chain node ${index}:`, {id: chainNode.id, type: chainNode.type});
            if (chainNode.type === 'magnode') {
                console.log(`[TextExtractor.getChainText] Skipping magnode in chain`);
                return;
            }
            const nodeText = this.getNodeText(chainNode.id, { ...context, skipMagnodeChain: true });
            console.log(`[TextExtractor.getChainText] Node text:`, nodeText?.substring(0, 30));
            if (nodeText) texts.push(nodeText);
        });
        
        const result = texts.join('');
        console.log(`[TextExtractor.getChainText] END - Returning:`, result?.substring(0, 100));
        return result;
    }
}

