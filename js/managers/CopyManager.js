class CopyManager {
    constructor(nodeManager, connectionManager, textExtractor) {
        this.nodeManager = nodeManager;
        this.connectionManager = connectionManager;
        this.textExtractor = textExtractor;
        console.log(`[CopyManager.constructor] Created CopyManager`);
    }
    
    copyChain(chain, app) {
        if (!Array.isArray(chain) || chain.length === 0) return;

        const magnodesToCycle = new Set();
        const processedNodes = new Set();
        const texts = [];

        const ctx = {
            nodeManager: this.nodeManager,
            connectionManager: this.connectionManager,
            textExtractor: this.textExtractor,
            magnodesToCycle,
            skipCycling: true
        };

        chain.forEach(node => {
            if (processedNodes.has(node.id)) return;

            // Skip non-active magnode inputs, add active parents to cycle
            const magParents = this.connectionManager.findAll(c => c.from === node.id && c.inputIndex !== undefined);
            let skip = false;
            magParents.forEach(conn => {
                const mag = this.nodeManager.find(conn.to);
                if (mag?.type === 'magnode') {
                    const active = mag.activeIndex || 0;
                    if (conn.inputIndex === active) {
                        magnodesToCycle.add(mag.id);
                    } else {
                        skip = true;
                    }
                }
            });
            if (skip) {
                processedNodes.add(node.id);
                return;
            }

            const t = this.textExtractor.getNodeText(node.id, ctx);
            if (t) {
                texts.push(t);
                processedNodes.add(node.id);
            }
        });

        const concatenationInput = document.getElementById('concatenationInput');
        const prefix = concatenationInput?.value.trim() || '';
        const combinedText = (prefix ? prefix : '') + texts.join('\n');

        navigator.clipboard.writeText(combinedText).then(() => {
            magnodesToCycle.forEach(id => {
                const mag = this.nodeManager.find(id);
                if (mag?.type === 'magnode' && mag.inputCount > 1) {
                    mag.activeIndex = (mag.activeIndex + 1) % mag.inputCount;
                }
            });
            chain.forEach(n => n.copyCount++);
            app.totalCopyCount += chain.length;
            if (chain.length > 0) app.lastCopiedId = chain[chain.length - 1].id;
            if (concatenationInput) concatenationInput.value = '';
            app.render();
        }).catch(err => {
            console.error(`[CopyManager.copyChain] ERROR copying:`, err);
        });
    }
    
    copyNode(nodeId, app) {
        console.log(`[CopyManager.copyNode] ========== START - Node ${nodeId} ==========`);
        const node = this.nodeManager.find(nodeId);
        if (!node) {
            console.log(`[CopyManager.copyNode] Node not found, returning`);
            return;
        }
        console.log(`[CopyManager.copyNode] Node found:`, {id: node.id, type: node.type});
        
        const magnodesToCycle = new Set();
        const context = {
            nodeManager: this.nodeManager,
            connectionManager: this.connectionManager,
            textExtractor: this.textExtractor,
            magnodesToCycle,
            skipCycling: true
        };
        
        console.log(`[CopyManager.copyNode] Getting text for node`);
        let textToCopy = this.textExtractor.getNodeText(nodeId, context);
        console.log(`[CopyManager.copyNode] Text result:`, textToCopy?.substring(0, 50));
        
        const concatenationInput = document.getElementById('concatenationInput');
        const concatenationText = concatenationInput?.value.trim() || '';
        if (concatenationText) {
            textToCopy = concatenationText + textToCopy;
            console.log(`[CopyManager.copyNode] Added concatenation text`);
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            console.log(`[CopyManager.copyNode] Text copied, cycling magnodes:`, Array.from(magnodesToCycle));
            magnodesToCycle.forEach(magnodeId => {
                const magnode = this.nodeManager.find(magnodeId);
                if (magnode?.type === 'magnode') {
                    const oldIndex = magnode.activeIndex;
                    magnode.cycle();
                    console.log(`[CopyManager.copyNode] Cycled magnode ${magnodeId} from ${oldIndex} to ${magnode.activeIndex}`);
                }
            });
            
            node.copyCount++;
            app.totalCopyCount++;
            app.lastCopiedId = nodeId;
            console.log(`[CopyManager.copyNode] ========== END ==========\n`);
            app.render();
        }).catch(err => {
            console.error(`[CopyManager.copyNode] ERROR copying:`, err);
        });
    }
}

