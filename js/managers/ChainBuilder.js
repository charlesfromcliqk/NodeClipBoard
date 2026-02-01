class ChainBuilder {
    constructor(nodeManager, connectionManager) {
        this.nodeManager = nodeManager;
        this.connectionManager = connectionManager;
        console.log(`[ChainBuilder.constructor] Created ChainBuilder`);
    }
    
    buildFromNode(startNodeId) {
        const visited = new Set();
        const chain = [];
        const magnodeInputsToSkip = new Set(); // Track all non-active magnode inputs
        
        const buildBackwards = (nodeId) => {
            // FIRST: Check if this node is a non-active magnode input - if so, skip it
            if (magnodeInputsToSkip.has(nodeId)) {
                return;
            }
            
            if (visited.has(nodeId)) {
                return;
            }
            visited.add(nodeId);
            
            const node = this.nodeManager.find(nodeId);
            if (!node) {
                return;
            }
            
            let incomingConnection = null;
            
            if (node.type === 'triple') {
                const inputs = this.connectionManager.getNodeInputs(nodeId);
                for (let i = 0; i < 3; i++) {
                    if (inputs[i].length > 0) {
                        incomingConnection = this.connectionManager.find(c => c.to === nodeId && c.inputIndex === i);
                        if (incomingConnection) {
                            break;
                        }
                    }
                }
            } else if (node.type === 'magnode') {
                const magnodeInputs = this.connectionManager.getMagnodeInputs(nodeId);
                const activeIndex = node.activeIndex || 0;
                
                // Mark the magnode itself to skip - it should never be in the chain
                magnodeInputsToSkip.add(nodeId);
                
                // Mark ALL non-active magnode inputs to skip
                magnodeInputs.forEach((inputArray, idx) => {
                    if (inputArray?.length > 0) {
                        const inputNodeId = inputArray[0];
                        if (idx !== activeIndex) {
                            magnodeInputsToSkip.add(inputNodeId);
                            visited.add(inputNodeId); // Also mark as visited so we don't process it
                        }
                    }
                });
                
                if (magnodeInputs[activeIndex]?.length > 0) {
                    const activeInputNodeId = magnodeInputs[activeIndex][0];
                    // Make sure active input is NOT in skip set
                    magnodeInputsToSkip.delete(activeInputNodeId);
                    // Recursively build from the active input instead of the magnode
                    buildBackwards(activeInputNodeId);
                }
                // Don't add the magnode itself to the chain
                return;
            } else if (node.type === 'instance') {
                incomingConnection = this.connectionManager.find(c => c.to === nodeId && c.inputIndex === 0);
            } else {
                incomingConnection = this.connectionManager.find(c => c.to === nodeId && (c.inputIndex === undefined || c.inputIndex === null));
            }
            
            if (incomingConnection) {
                buildBackwards(incomingConnection.from);
            }
            
            // Only add node if it's not a non-active magnode input
            if (!magnodeInputsToSkip.has(nodeId)) {
                chain.push(node);
            }
        };
        
        buildBackwards(startNodeId);
        return chain;
    }
}

