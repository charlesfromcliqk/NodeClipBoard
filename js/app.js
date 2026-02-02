// Main Application Class
class App {
    constructor() {
        // Initialize managers
        this.nodeManager = new NodeManager();
        this.connections = [];
        this.connectionManager = new ConnectionManager(this.connections, this.nodeManager);
        this.textExtractor = new TextExtractor(this.nodeManager, this.connectionManager);
        this.copyManager = new CopyManager(this.nodeManager, this.connectionManager, this.textExtractor);
        this.chainBuilder = new ChainBuilder(this.nodeManager, this.connectionManager);
        this.fileManager = new FileManager(this);
        
        // Keep nodes array in sync with nodeManager.nodes
        this.nodes = this.nodeManager.nodes;
        
        // State variables
        this.totalCopyCount = 0;
        this.lastCopiedId = null;
        this.connectingFrom = null;
        this.connectingFromInputIndex = null;
        this.connectingTo = null;
        this.connectingToInputIndex = null;
        this.filename = '';
        this.mouseX = 0;
        this.mouseY = 0;
        this.draggingWaypoint = null;
        this.waypointStartX = 0;
        this.waypointStartY = 0;
        
        // Bind methods to maintain 'this' context
        this.handleConnectorStart = this.handleConnectorStart.bind(this);
        this.handleConnectorMove = this.handleConnectorMove.bind(this);
        this.handleConnectorEnd = this.handleConnectorEnd.bind(this);
        this.handleWaypointDrag = this.handleWaypointDrag.bind(this);
        this.handleWaypointMove = this.handleWaypointMove.bind(this);
        this.handleWaypointEnd = this.handleWaypointEnd.bind(this);
        this.handleWaypointDelete = this.handleWaypointDelete.bind(this);
        this.handleFileSelect = this.handleFileSelect.bind(this);
        
        // Setup global mouse tracking
        document.addEventListener('mousemove', (e) => {
            const container = document.getElementById('nodesContainer');
            if (container) {
                const containerRect = container.getBoundingClientRect();
                this.mouseX = e.clientX - containerRect.left;
                this.mouseY = e.clientY - containerRect.top;
            }
        });
        
        // Setup file input handler
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect);
        }
    }
    
    static getInstance() {
        if (!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }
    
    // Node Creation Methods
    createNode(type, options = {}) {
        return this.nodeManager.create(type, options.x, options.y, options);
    }
    
    addNode(x = null, y = null) {
        this.nodeManager.create('regular', x, y, {});
        this.render();
    }
    
    addTripleNode(x = null, y = null) {
        this.nodeManager.create('triple', x, y, { title: 'Triple Node' });
        this.render();
    }
    
    addMagnode(x = null, y = null) {
        this.nodeManager.create('magnode', x, y, { title: 'Magnode' });
        this.render();
    }
    
    addInstanceNode(x = null, y = null) {
        this.nodeManager.create('instance', x, y, { title: 'Instance Node' });
        this.render();
    }
    
    addMagnodeInput(nodeId) {
        const node = this.nodeManager.find(nodeId);
        if (node && node.type === 'magnode') {
            const oldInputCount = node.inputCount || 2;
            node.inputCount = oldInputCount + 1;
            const newInputIndex = oldInputCount;
            
            const newNode = this.createNode('regular', {
                x: node.x - 320,
                y: node.y + (newInputIndex * 60),
                title: '',
                text: ''
            });
            this.nodes.push(newNode);
            
            this.addConnection(newNode.id, nodeId, newInputIndex);
            this.render();
            
            setTimeout(() => {
                const newTextarea = document.querySelector(`.node[data-node-id="${newNode.id}"] .blurb-textarea`);
                if (newTextarea) {
                    newTextarea.focus();
                }
            }, 0);
        }
    }
    
    removeNode(nodeId) {
        this.nodeManager.remove(nodeId);
        this.connectionManager.removeAllForNode(nodeId);
        this.render();
    }
    
    // Node Update Methods
    updateNodeProperty(nodeId, property, value) {
        const node = this.nodeManager.find(nodeId);
        if (node) {
            node[property] = value;
        }
    }
    
    updateNodeText(nodeId, text) {
        this.updateNodeProperty(nodeId, 'text', text);
        const instanceConnections = this.connectionManager.findAll(c => 
            c.to && this.nodeManager.find(c.to) && 
            this.nodeManager.find(c.to).type === 'instance' && 
            c.inputIndex === 1 && c.from === nodeId
        );
        if (instanceConnections.length > 0) {
            this.render();
        }
    }
    
    cycleMagnode(nodeId) {
        const node = this.nodeManager.find(nodeId);
        if (node && node.type === 'magnode') {
            const inputCount = node.inputCount || 2;
            node.activeIndex = ((node.activeIndex || 0) + 1) % inputCount;
            this.render();
        }
    }
    
    updateNodeTitle(nodeId, title) {
        this.updateNodeProperty(nodeId, 'title', title.trim() || '');
    }
    
    cycleTripleNodeSkip(nodeId) {
        const node = this.nodeManager.find(nodeId);
        if (node && node.type === 'triple') {
            node.skipIndex = ((node.skipIndex || 0) + 1) % 3;
            this.render();
        }
    }
    
    separateNode(nodeId) {
        const node = this.nodeManager.find(nodeId);
        if (!node) return;
        
        const nodeElement = document.querySelector(`.node[data-node-id="${nodeId}"]`);
        if (!nodeElement) return;
        
        const textarea = nodeElement.querySelector('.blurb-textarea');
        if (!textarea) return;
        
        const cursorPos = textarea.selectionStart;
        const text = textarea.value;
        const textBefore = text.substring(0, cursorPos);
        const textAfter = text.substring(cursorPos);
        
        node.text = textBefore;
        
        const newNode = this.createNode('regular', {
            x: node.x + 320,
            y: node.y,
            text: textAfter,
            title: '',
            allowSplit: node.allowSplit
        });
        
        const magConns = this.connectionManager.findAll(c => 
            c.from === nodeId && c.inputIndex !== undefined && c.inputIndex !== null
        );
        magConns.forEach(conn => {
            const mag = this.nodeManager.find(conn.to);
            if (!mag || mag.type !== 'magnode') return;
            const nextIndex = (conn.inputIndex || 0) + 1;
            if ((mag.inputCount || 2) <= nextIndex) {
                mag.inputCount = nextIndex + 1;
            }
            const occupied = this.connectionManager.find(c => c.to === mag.id && c.inputIndex === nextIndex);
            if (!occupied) this.addConnection(newNode.id, mag.id, nextIndex);
        });
        
        this.render();
        
        setTimeout(() => {
            const newTextarea = document.querySelector(`.node[data-node-id="${newNode.id}"] .blurb-textarea`);
            if (newTextarea) {
                newTextarea.focus();
                newTextarea.setSelectionRange(0, 0);
            }
        }, 0);
    }
    
    // Connection Methods
    getNodeInputs(nodeId) {
        return this.connectionManager.getNodeInputs(nodeId);
    }
    
    getMagnodeInputs(nodeId) {
        return this.connectionManager.getMagnodeInputs(nodeId);
    }
    
    getInstanceInputs(nodeId) {
        return this.connectionManager.getInstanceInputs(nodeId);
    }
    
    getIncomingConnection(nodeId, inputIndex = null) {
        if (inputIndex !== null) {
            return this.connectionManager.find(c => c.to === nodeId && c.inputIndex === inputIndex);
        }
        return this.connectionManager.find(c => c.to === nodeId && (c.inputIndex === undefined || c.inputIndex === null));
    }
    
    addConnection(fromId, toId, inputIndex = null) {
        this.connectionManager.add(fromId, toId, inputIndex);
    }
    
    removeConnection(fromId, toId, inputIndex = null) {
        this.connectionManager.remove(fromId, toId, inputIndex);
    }
    
    // Chain Methods
    buildChainFromNode(startNodeId) {
        return this.chainBuilder.buildFromNode(startNodeId);
    }
    
    getAllChains() {
        const chains = [];
        const processedEndNodes = new Set();
        
        const endNodes = this.nodes.filter(node => {
            const hasOutgoingChain = this.connectionManager.findAll(c => 
                c.from === node.id && (c.inputIndex === undefined || c.inputIndex === null)
            ).length > 0;
            const hasOutgoingInstanceChain = this.connectionManager.findAll(c => 
                c.from === node.id && c.inputIndex === 0
            ).length > 0;
            return !hasOutgoingChain && !hasOutgoingInstanceChain;
        });
        
        endNodes.forEach(endNode => {
            if (processedEndNodes.has(endNode.id)) return;
            const chain = this.chainBuilder.buildFromNode(endNode.id);
            if (chain.length > 0) {
                chains.push(chain);
                chain.forEach(node => processedEndNodes.add(node.id));
            }
        });
        
        this.nodes.forEach(node => {
            if (!processedEndNodes.has(node.id)) {
                const magnodeConnections = this.connectionManager.findAll(c => 
                    c.from === node.id && c.inputIndex !== undefined
                );
                let isNonActiveMagnodeInput = false;
                magnodeConnections.forEach(conn => {
                    const magnode = this.nodeManager.find(conn.to);
                    if (magnode?.type === 'magnode') {
                        const activeIndex = magnode.activeIndex || 0;
                        if (conn.inputIndex !== activeIndex) {
                            isNonActiveMagnodeInput = true;
                        }
                    }
                });
                if (!isNonActiveMagnodeInput) {
                    chains.push([node]);
                }
            }
        });
        
        return chains;
    }
    
    copyChainFromNode(nodeId) {
        const chain = this.chainBuilder.buildFromNode(nodeId);
        this.copyManager.copyChain(chain, this);
    }
    
    // Copy Methods
    copyToClipboard(nodeId) {
        this.copyManager.copyNode(nodeId, this);
    }
    
    cycleCopy() {
        if (this.nodes.length === 0) return;
        
        let nextNode = null;
        if (this.lastCopiedId !== null) {
            const currentIndex = this.nodes.findIndex(n => n.id === this.lastCopiedId);
            if (currentIndex !== -1) {
                const nextIndex = (currentIndex + 1) % this.nodes.length;
                nextNode = this.nodes[nextIndex];
            } else {
                nextNode = this.nodes[0];
            }
        } else {
            nextNode = this.nodes[0];
        }
        
        if (nextNode) {
            this.copyToClipboard(nextNode.id);
        }
    }
    
    updateCopyButton(id) {
        const nodeElement = document.querySelector(`.node[data-node-id="${id}"]`);
        if (nodeElement) {
            const button = nodeElement.querySelector('.btn-copy');
            if (button) {
                button.classList.add('copied');
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.textContent = 'Copy';
                }, 2000);
            }
        }
    }
    
    // File Methods
    saveData() {
        this.fileManager.saveData();
    }
    
    async saveAsData() {
        await this.fileManager.saveAsData();
    }
    
    loadData() {
        this.fileManager.loadData();
    }
    
    handleFileSelect(event) {
        this.fileManager.handleFileSelect(event);
    }
    
    // Stage Generator Methods (keeping original functionality)
    addStage1Generator(x = null, y = null) {
        const baseX = x !== null ? x : 92.38851996487745;
        const baseY = y !== null ? y : 164.23041934490902;
        
        const giveMeNode = this.createNode('regular', { x: baseX, y: baseY, title: 'Give me', text: 'give me' });
        const countNode = this.createNode('regular', { x: baseX + 380, y: baseY - 8, title: 'Count', text: '10' });
        const companiesNode = this.createNode('regular', { x: baseX + 726, y: baseY + 4, title: 'Companies that do', text: 'companies that do' });
        const virtueNode = this.createNode('regular', { x: baseX + 44, y: baseY + 316, title: 'Virtue', text: 'transparency' });
        const wellNode = this.createNode('regular', { x: baseX + 440, y: baseY + 444, title: 'Well', text: 'well' });
        const poorlyNode = this.createNode('regular', { x: baseX + 422, y: baseY + 668, title: 'Poorly', text: 'poorly' });
        const magnode = this.createNode('magnode', { x: baseX + 862, y: baseY + 410, title: 'Well/Poorly Switch' });
        const virtueInstance1 = this.createNode('instance', { x: baseX + 1132, y: baseY + 2, title: 'Virtue Instance' });
        const wellPoorlyInstance = this.createNode('instance', { x: baseX + 1472, y: baseY + 8, title: 'Well/Poorly Instance' });
        const provideNode = this.createNode('regular', { x: baseX + 1826, y: baseY + 8, title: 'Provide', text: 'Provide:\n\nCompany name\n\nAnd a brief blurb explaining how they do' });
        const virtueInstance2 = this.createNode('instance', { x: baseX + 2180, y: baseY + 12, title: 'Virtue Instance' });
        const wellPoorlyInstance2 = this.createNode('instance', { x: baseX + 2504, y: baseY + 26, title: 'Well/Poorly Instance' });
        const eraNode = this.createNode('regular', { x: baseX + 2840, y: baseY + 24, title: 'Era context', text: 'and in what era/context this occurred.' });
        
        this.addConnection(giveMeNode.id, countNode.id);
        this.addConnection(countNode.id, companiesNode.id);
        this.addConnection(companiesNode.id, virtueInstance1.id, 0);
        this.addConnection(virtueInstance1.id, wellPoorlyInstance.id, 0);
        this.addConnection(wellPoorlyInstance.id, provideNode.id);
        this.addConnection(provideNode.id, virtueInstance2.id, 0);
        this.addConnection(virtueInstance2.id, wellPoorlyInstance2.id, 0);
        this.addConnection(wellPoorlyInstance2.id, eraNode.id);
        this.addConnection(virtueNode.id, virtueInstance1.id, 1);
        this.addConnection(virtueNode.id, virtueInstance2.id, 1);
        this.addConnection(magnode.id, wellPoorlyInstance.id, 1);
        this.addConnection(magnode.id, wellPoorlyInstance2.id, 1);
        this.addConnection(wellNode.id, magnode.id, 0);
        this.addConnection(poorlyNode.id, magnode.id, 1);
        
        this.render();
    }
    
    addStage2Generator(x = null, y = null) {
        const baseX = x !== null ? x : 92.38851996487745;
        const baseY = y !== null ? y : 400;
        
        const didNode = this.createNode('regular', { x: baseX, y: baseY, title: 'Did', text: 'Did' });
        const companyMagnode = this.createNode('magnode', { x: baseX + 200, y: baseY + 200, title: 'Company Magnode' });
        const companyInstance = this.createNode('instance', { x: baseX + 200, y: baseY, title: 'Company Instance' });
        const doNode = this.createNode('regular', { x: baseX + 400, y: baseY, title: 'do', text: 'do' });
        const virtueNode = this.createNode('regular', { x: baseX + 600, y: baseY, title: 'Virtue', text: 'transparency' });
        const wellPoorlyNode = this.createNode('regular', { x: baseX + 800, y: baseY, title: 'Well/Poorly', text: 'well' });
        const aroundNode = this.createNode('regular', { x: baseX + 1000, y: baseY, title: 'around', text: 'around' });
        const timeframeNode = this.createNode('regular', { x: baseX + 1200, y: baseY, title: 'Timeframe', text: '[timeframe]' });
        const elaborationNode = this.createNode('regular', { x: baseX + 1400, y: baseY, title: 'Elaboration Prompt', text: 'and does this blurb explain it well? If not, rewrite the blurb. From there, please elaborate in a paragraph or two. Do not tell me it does or does not; merely rewrite the blurb as necessary and elaborate on it from reliable sources.' });
        
        this.addConnection(didNode.id, companyInstance.id, 0);
        this.addConnection(companyInstance.id, doNode.id);
        this.addConnection(doNode.id, virtueNode.id);
        this.addConnection(virtueNode.id, wellPoorlyNode.id);
        this.addConnection(wellPoorlyNode.id, aroundNode.id);
        this.addConnection(aroundNode.id, timeframeNode.id);
        this.addConnection(timeframeNode.id, elaborationNode.id);
        this.addConnection(companyMagnode.id, companyInstance.id, 1);
        
        this.render();
    }
    
    addStage3Generator(x = null, y = null) {
        const baseX = x !== null ? x : 92.38851996487745;
        const baseY = y !== null ? y : 600;
        
        const writeNode = this.createNode('regular', { x: baseX, y: baseY, title: 'Write a LinkedIn post about how', text: 'Write a LinkedIn post about how' });
        const companyMagnode = this.createNode('magnode', { x: baseX + 400, y: baseY + 200, title: 'Company Magnode' });
        const companyInstance = this.createNode('instance', { x: baseX + 400, y: baseY, title: 'Company Instance' });
        const didNode = this.createNode('regular', { x: baseX + 720, y: baseY, title: 'did', text: 'did' });
        const respectNode = this.createNode('regular', { x: baseX + 920, y: baseY, title: 'respect the principle of', text: 'respect the principle of' });
        const virtueNode = this.createNode('regular', { x: baseX + 1280, y: baseY, title: 'virtue', text: 'virtue' });
        const affectedNode = this.createNode('regular', { x: baseX + 1480, y: baseY, title: 'and how it affected them.', text: 'and how it affected them.' });
        
        this.addConnection(writeNode.id, companyInstance.id, 0);
        this.addConnection(companyInstance.id, didNode.id);
        this.addConnection(didNode.id, respectNode.id);
        this.addConnection(respectNode.id, virtueNode.id);
        this.addConnection(virtueNode.id, affectedNode.id);
        this.addConnection(companyMagnode.id, companyInstance.id, 1);
        
        this.render();
    }
    
    // Rendering Methods (continued in next part due to size)
    calculateTotalCount() {
        return this.nodes.reduce((sum, node) => sum + node.copyCount, 0);
    }
    
    renderNodeConnectors(node, isTriple, isMagnode, isInstance) {
        let html = '';
        
        if (isTriple) {
            const inputs = this.getNodeInputs(node.id);
            const skipIndex = node.skipIndex || 0;
            for (let i = 0; i < 3; i++) {
                const hasInput = inputs[i].length > 0;
                const isSkipped = i === skipIndex;
                html += `
                    <div class="connector connector-in triple ${hasInput ? 'connected' : ''} ${isSkipped ? 'skipped' : ''}" 
                         data-connector-type="in" 
                         data-node-id="${node.id}"
                         data-input-index="${i}"
                         title="Input ${i + 1}${isSkipped ? ' (skipped)' : ''} - drag to connect"></div>
                `;
            }
        } else if (isMagnode) {
            const magnodeInputs = this.getMagnodeInputs(node.id);
            const activeIndex = node.activeIndex || 0;
            const inputCount = node.inputCount || 2;
            for (let i = 0; i < inputCount; i++) {
                const hasInput = magnodeInputs[i] && magnodeInputs[i].length > 0;
                const isActive = i === activeIndex;
                html += `
                    <div class="connector connector-in triple ${hasInput ? 'connected' : ''} ${isActive ? 'active' : ''}" 
                         data-connector-type="in" 
                         data-node-id="${node.id}"
                         data-input-index="${i}"
                         title="Input ${i + 1}${isActive ? ' (active)' : ''} - drag to connect"></div>
                `;
            }
        } else if (isInstance) {
            const instanceInputs = this.getInstanceInputs(node.id);
            html += `
                <div class="connector connector-in triple ${instanceInputs[1] && instanceInputs[1].length > 0 ? 'connected' : ''}" 
                     data-connector-type="in" 
                     data-node-id="${node.id}"
                     data-input-index="1"
                     title="Top-right input: content reference (replaces text box)"></div>
                <div class="connector connector-in triple ${instanceInputs[0] && instanceInputs[0].length > 0 ? 'connected' : ''}" 
                     data-connector-type="in" 
                     data-node-id="${node.id}"
                     data-input-index="0"
                     title="Bottom-right input: chain input"></div>
            `;
        } else {
            const hasIncoming = this.connectionManager.find(c => c.to === node.id && (c.inputIndex === undefined || c.inputIndex === null));
            html = `
                <div class="connector connector-in ${hasIncoming ? 'connected' : ''}" 
                     data-connector-type="in" 
                     data-node-id="${node.id}"
                     title="Input connector - drag to connect"></div>
            `;
        }
        
        return html;
    }
    
    renderNodeActions(node, isTriple, isMagnode, isInstance, copyButtonClass, activeIndex) {
        if (isInstance) {
            return `
                <div style="display: flex; gap: 6px;">
                    <button class="${copyButtonClass}" onclick="app.copyToClipboard(${node.id})">Copy</button>
                </div>
            `;
        } else if (!isTriple && !isMagnode) {
            return `
                <div style="display: flex; gap: 6px;">
                    <button class="btn-separate" onclick="app.separateNode(${node.id})" title="Split this node at cursor position">Separate Node</button>
                    <button class="${copyButtonClass}" onclick="app.copyToClipboard(${node.id})">Copy</button>
                </div>
            `;
        } else if (isTriple) {
            const skipIndex = node.skipIndex || 0;
            return `
                <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                    <button class="btn-cycle" onclick="app.cycleTripleNodeSkip(${node.id})" style="width: 100%; padding: 6px 12px; font-size: 11px;" title="Cycle which input is skipped (currently: ${skipIndex + 1})">Cycle Skip (${skipIndex + 1})</button>
                    <button class="${copyButtonClass}" onclick="app.copyToClipboard(${node.id})" style="width: 100%;">Copy (2 of 3)</button>
                </div>
            `;
        } else {
            const inputCount = node.inputCount || 2;
            const nextIndex = ((activeIndex || 0) + 1) % inputCount;
            return `
                <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                    <button class="btn-cycle" onclick="app.cycleMagnode(${node.id})" style="width: 100%; padding: 6px 12px; font-size: 11px;" title="Cycle to input ${nextIndex + 1}">Cycle (Input ${activeIndex + 1})</button>
                    <button class="${copyButtonClass}" onclick="app.copyToClipboard(${node.id})" style="width: 100%;">Copy</button>
                </div>
            `;
        }
    }
    
    render() {
        const container = document.getElementById('nodesContainer');
        const emptyState = document.getElementById('emptyState');
        this.totalCopyCount = this.calculateTotalCount();
        
        document.getElementById('totalCount').textContent = this.totalCopyCount;
        document.getElementById('nodeCount').textContent = this.nodes.length;
        
        if (this.nodes.length === 0) {
            emptyState.style.display = 'block';
            container.querySelectorAll('.node').forEach(node => node.remove());
            container.querySelectorAll('.chain-copy-button').forEach(btn => btn.remove());
            this.updateConnections();
            return;
        }
        
        emptyState.style.display = 'none';
        container.querySelectorAll('.node').forEach(node => node.remove());
        container.querySelectorAll('.chain-copy-button').forEach(btn => btn.remove());
        
        this.nodes.forEach(node => {
            const nodeElement = document.createElement('div');
            const isTriple = node.type === 'triple';
            const isMagnode = node.type === 'magnode';
            const isInstance = node.type === 'instance';
            let nodeClass = 'node';
            if (isTriple) nodeClass += ' triple-node';
            if (isMagnode) nodeClass += ' magnode';
            if (isInstance) nodeClass += ' instance-node';
            nodeElement.className = nodeClass;
            nodeElement.dataset.nodeId = node.id;
            nodeElement.style.left = node.x + 'px';
            nodeElement.style.top = node.y + 'px';
            nodeElement.style.zIndex = 10 + Math.floor(node.y / 10);
            
            const hasOutgoing = this.connectionManager.find(c => c.from === node.id);
            const copyButtonClass = this.lastCopiedId === node.id ? 'btn-copy last-copied' : 'btn-copy';
            const activeIndex = isMagnode ? (node.activeIndex || 0) : -1;
            
            let instanceContent = '';
            if (isInstance) {
                const inputs = this.getInstanceInputs(node.id);
                if (inputs[1] && inputs[1].length > 0) {
                    const refNode = this.nodeManager.find(inputs[1][0]);
                    if (refNode) {
                        if (refNode.type === 'magnode') {
                            const magnodeInputs = this.getMagnodeInputs(refNode.id);
                            const activeIndex = refNode.activeIndex || 0;
                            if (magnodeInputs[activeIndex] && magnodeInputs[activeIndex].length > 0) {
                                const activeInputNode = this.nodeManager.find(magnodeInputs[activeIndex][0]);
                                if (activeInputNode) {
                                    instanceContent = Utils.normalizeText(activeInputNode.text);
                                }
                            }
                        } else {
                            instanceContent = Utils.normalizeText(refNode.text);
                        }
                    }
                }
            }
            
            const inputConnectorsHtml = this.renderNodeConnectors(node, isTriple, isMagnode, isInstance);
            const nodeActionsHtml = this.renderNodeActions(node, isTriple, isMagnode, isInstance, copyButtonClass, activeIndex);
            
            nodeElement.innerHTML = `
                <div class="node-header">
                    <div class="copy-count">Copied: ${node.copyCount}${isTriple ? ` (skip: ${(node.skipIndex || 0) + 1})` : ''}</div>
                    <button class="btn-delete" onclick="app.removeNode(${node.id})" title="Delete node">Delete</button>
                </div>
                ${
                    isInstance
                        ? `
                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                <div class="node-content" style="flex: 1;">
                                    <input type="text" class="blurb-title" placeholder="Node title (optional)" value="${Utils.escapeHtml(node.title || '')}" oninput="app.updateNodeTitle(${node.id}, this.value)" />
                                    <div class="instance-placeholder">${Utils.escapeHtml(instanceContent) || 'Content comes from top-right input'}</div>
                                </div>
                                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                                    <div class="node-connectors-in" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                                        ${inputConnectorsHtml}
                                    </div>
                                    <div class="node-connectors-out">
                                        <div class="connector connector-out ${hasOutgoing ? 'connected' : ''}" 
                                             data-connector-type="out" 
                                             data-node-id="${node.id}"
                                             title="Output connector - drag from another node's input to connect"></div>
                                    </div>
                                </div>
                            </div>
                        `
                        : isMagnode
                        ? `
                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                <div class="node-connectors-in" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                                    ${inputConnectorsHtml}
                                    <button class="btn-add-input" onclick="app.addMagnodeInput(${node.id})" title="Add another input">+ Add Input</button>
                                </div>
                                <div class="node-content" style="flex: 1;">
                                    <input type="text" class="blurb-title" placeholder="Node title (optional)" value="${Utils.escapeHtml(node.title || '')}" oninput="app.updateNodeTitle(${node.id}, this.value)" />
                                    <textarea class="blurb-textarea" placeholder="Magnode - outputs one input at a time" oninput="app.updateNodeText(${node.id}, this.value)" readonly>${Utils.escapeHtml(node.text)}</textarea>
                                </div>
                                <div class="node-connectors-out">
                                    <div class="connector connector-out ${hasOutgoing ? 'connected' : ''}" 
                                         data-connector-type="out" 
                                         data-node-id="${node.id}"
                                         title="Output connector - drag from another node's input to connect"></div>
                                </div>
                            </div>
                        `
                        : `
                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                <div class="node-connectors-in" style="${isTriple ? 'display: flex; flex-direction: column; align-items: flex-start; gap: 4px;' : ''}">
                                    ${inputConnectorsHtml}
                                </div>
                                <div class="node-content" style="flex: 1;">
                                    <input type="text" class="blurb-title" placeholder="Node title (optional)" value="${Utils.escapeHtml(node.title || '')}" oninput="app.updateNodeTitle(${node.id}, this.value)" />
                                    <textarea class="blurb-textarea" placeholder="${isTriple ? 'Triple node - connects to 3 inputs' : 'Enter your text here...'}" oninput="app.updateNodeText(${node.id}, this.value)" ${isTriple ? 'readonly' : ''}>${Utils.escapeHtml(node.text)}</textarea>
                                </div>
                                <div class="node-connectors-out">
                                    <div class="connector connector-out ${hasOutgoing ? 'connected' : ''}" 
                                         data-connector-type="out" 
                                         data-node-id="${node.id}"
                                         title="Output connector - drag from another node's input to connect"></div>
                                </div>
                            </div>
                        `
                }
                <div class="node-actions">
                    ${nodeActionsHtml}
                </div>
            `;
            
            this.makeNodeDraggable(nodeElement, node);
            this.attachConnectorHandlers(nodeElement, node, isTriple, isMagnode, isInstance);
            
            if (!isTriple && !isMagnode && !isInstance) {
                const textarea = nodeElement.querySelector('.blurb-textarea');
                if (textarea) {
                    textarea.dataset.nodeId = node.id;
                }
            }
            
            container.appendChild(nodeElement);
        });
        
        this.renderChainButtons();
        this.updateConnections();
        this.setupWaypointHandlers();
        this.updateContainerSize();
    }
    
    updateContainerSize() {
        const container = document.getElementById('nodesContainer');
        if (this.nodes.length === 0) {
            container.style.height = 'auto';
            return;
        }
        
        let maxX = 0;
        let maxY = 0;
        this.nodes.forEach(node => {
            const nodeElement = document.querySelector(`.node[data-node-id="${node.id}"]`);
            if (nodeElement) {
                const rect = nodeElement.getBoundingClientRect();
                maxX = Math.max(maxX, node.x + rect.width);
                maxY = Math.max(maxY, node.y + rect.height);
            } else {
                maxX = Math.max(maxX, node.x + 300);
                maxY = Math.max(maxY, node.y + 200);
            }
        });
        
        const minHeight = Math.max(400, maxY + 100);
        container.style.height = minHeight + 'px';
        
        const svg = document.getElementById('connectionsSvg');
        if (svg) {
            svg.style.width = '100%';
            svg.style.height = '100%';
        }
    }
    
    attachConnectorHandlers(nodeElement, node, isTriple, isMagnode, isInstance) {
        let connectorClickStart = null;
        const attachConnectorClick = (connector, nodeId, connectorType, inputIndex = null) => {
            connector.addEventListener('mousedown', (e) => {
                if (e.button === 0) {
                    connectorClickStart = { x: e.clientX, y: e.clientY, time: Date.now() };
                }
            });
            
            connector.addEventListener('click', (e) => {
                if (connectorClickStart) {
                    const dx = Math.abs(e.clientX - connectorClickStart.x);
                    const dy = Math.abs(e.clientY - connectorClickStart.y);
                    const dt = Date.now() - connectorClickStart.time;
                    
                    const isConnected = connector.classList.contains('connected');
                    if (isConnected && dx < 5 && dy < 5 && dt < 300 && !e.shiftKey) {
                        e.stopPropagation();
                        e.preventDefault();
                        this.createWaypoint(nodeId, connectorType, inputIndex);
                    }
                    connectorClickStart = null;
                }
            });
        };
        
        if (isTriple) {
            for (let i = 0; i < 3; i++) {
                const connectorIn = nodeElement.querySelector(`.connector-in[data-input-index="${i}"]`);
                if (connectorIn) {
                    connectorIn.addEventListener('mousedown', (e) => this.handleConnectorStart(e, node.id, 'in', i));
                    attachConnectorClick(connectorIn, node.id, 'in', i);
                }
            }
        } else if (isMagnode) {
            const inputCount = node.inputCount || 2;
            for (let i = 0; i < inputCount; i++) {
                const connectorIn = nodeElement.querySelector(`.connector-in[data-input-index="${i}"]`);
                if (connectorIn) {
                    connectorIn.addEventListener('mousedown', (e) => this.handleConnectorStart(e, node.id, 'in', i));
                    attachConnectorClick(connectorIn, node.id, 'in', i);
                }
            }
        } else if (isInstance) {
            for (let i = 0; i < 2; i++) {
                const connectorIn = nodeElement.querySelector(`.connector-in[data-input-index="${i}"]`);
                if (connectorIn) {
                    connectorIn.addEventListener('mousedown', (e) => this.handleConnectorStart(e, node.id, 'in', i));
                    attachConnectorClick(connectorIn, node.id, 'in', i);
                }
            }
        } else {
            const connectorIn = nodeElement.querySelector('.connector-in');
            if (connectorIn) {
                connectorIn.addEventListener('mousedown', (e) => this.handleConnectorStart(e, node.id, 'in'));
                attachConnectorClick(connectorIn, node.id, 'in');
            }
        }
        
        const connectorOut = nodeElement.querySelector('.connector-out');
        if (connectorOut) {
            connectorOut.addEventListener('mousedown', (e) => this.handleConnectorStart(e, node.id, 'out'));
            attachConnectorClick(connectorOut, node.id, 'out');
        }
    }
    
    createWaypoint(nodeId, connectorType, inputIndex) {
        const container = document.getElementById('nodesContainer');
        const containerRect = container.getBoundingClientRect();
        
        let matchingConnections = [];
        if (connectorType === 'in') {
            matchingConnections = this.connections.filter(conn => {
                if (conn.to !== nodeId) return false;
                if (inputIndex !== null && inputIndex !== undefined) {
                    return conn.inputIndex === inputIndex;
                }
                return conn.inputIndex === undefined || conn.inputIndex === null;
            });
        } else {
            matchingConnections = this.connections.filter(conn => conn.from === nodeId);
        }
        
        if (matchingConnections.length === 0) return;
        
        matchingConnections.forEach(conn => {
            const fromNode = this.nodeManager.find(conn.from);
            const toNode = this.nodeManager.find(conn.to);
            if (!fromNode || !toNode) return;
            
            const fromNodeElement = document.querySelector(`.node[data-node-id="${conn.from}"]`);
            const toNodeElement = document.querySelector(`.node[data-node-id="${conn.to}"]`);
            if (!fromNodeElement || !toNodeElement) return;
            
            const fromConnector = fromNodeElement.querySelector('.connector-out');
            let toConnector;
            if ((toNode.type === 'triple' || toNode.type === 'magnode' || toNode.type === 'instance') && conn.inputIndex !== undefined) {
                toConnector = toNodeElement.querySelector(`.connector-in[data-input-index="${conn.inputIndex}"]`);
            } else {
                toConnector = toNodeElement.querySelector('.connector-in:not([data-input-index])');
            }
            if (!fromConnector || !toConnector) return;
            
            const fromPos = Utils.getConnectorPosition(fromConnector, containerRect);
            const toPos = Utils.getConnectorPosition(toConnector, containerRect);
            
            if (!conn.waypoints) {
                conn.waypoints = [];
            }
            
            const waypoint = {
                x: (fromPos.x + toPos.x) / 2,
                y: (fromPos.y + toPos.y) / 2
            };
            
            conn.waypoints.push(waypoint);
            this.updateConnections();
        });
    }
    
    setupWaypointHandlers() {
        const svg = document.getElementById('connectionsSvg');
        if (!svg) return;
        
        svg.querySelectorAll('.waypoint').forEach(wp => {
            wp.removeEventListener('mousedown', this.handleWaypointDrag);
            wp.removeEventListener('contextmenu', this.handleWaypointDelete);
            wp.addEventListener('mousedown', this.handleWaypointDrag);
            wp.addEventListener('contextmenu', this.handleWaypointDelete);
        });
    }
    
    handleWaypointDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const connIndex = parseInt(e.target.getAttribute('data-connection-index'));
        const wpIndex = parseInt(e.target.getAttribute('data-waypoint-index'));
        
        if (isNaN(connIndex) || isNaN(wpIndex)) return;
        
        this.draggingWaypoint = { connIndex, wpIndex };
        const container = document.getElementById('nodesContainer');
        const containerRect = container.getBoundingClientRect();
        this.waypointStartX = e.clientX - containerRect.left;
        this.waypointStartY = e.clientY - containerRect.top;
        
        document.addEventListener('mousemove', this.handleWaypointMove);
        document.addEventListener('mouseup', this.handleWaypointEnd);
    }
    
    handleWaypointMove(e) {
        if (!this.draggingWaypoint) return;
        
        const container = document.getElementById('nodesContainer');
        const containerRect = container.getBoundingClientRect();
        const newX = e.clientX - containerRect.left;
        const newY = e.clientY - containerRect.top;
        
        const conn = this.connections[this.draggingWaypoint.connIndex];
        if (conn && conn.waypoints && conn.waypoints[this.draggingWaypoint.wpIndex]) {
            conn.waypoints[this.draggingWaypoint.wpIndex].x = newX;
            conn.waypoints[this.draggingWaypoint.wpIndex].y = newY;
            
            const svg = document.getElementById('connectionsSvg');
            const waypointCircle = svg.querySelector(`.waypoint[data-connection-index="${this.draggingWaypoint.connIndex}"][data-waypoint-index="${this.draggingWaypoint.wpIndex}"]`);
            if (waypointCircle) {
                waypointCircle.setAttribute('cx', newX);
                waypointCircle.setAttribute('cy', newY);
            }
            
            this.updateSingleConnectionPath(this.draggingWaypoint.connIndex);
        }
    }
    
    updateSingleConnectionPath(connIndex) {
        const conn = this.connections[connIndex];
        if (!conn) return;
        
        const svg = document.getElementById('connectionsSvg');
        const container = document.getElementById('nodesContainer');
        const containerRect = container.getBoundingClientRect();
        
        const fromNode = this.nodeManager.find(conn.from);
        const toNode = this.nodeManager.find(conn.to);
        if (!fromNode || !toNode) return;
        
        const fromNodeElement = document.querySelector(`.node[data-node-id="${conn.from}"]`);
        const toNodeElement = document.querySelector(`.node[data-node-id="${conn.to}"]`);
        if (!fromNodeElement || !toNodeElement) return;
        
        const fromConnector = fromNodeElement.querySelector('.connector-out');
        if (!fromConnector) return;
        
        let toConnector;
        if ((toNode.type === 'triple' || toNode.type === 'magnode' || toNode.type === 'instance') && conn.inputIndex !== undefined) {
            toConnector = toNodeElement.querySelector(`.connector-in[data-input-index="${conn.inputIndex}"]`);
        } else {
            toConnector = toNodeElement.querySelector('.connector-in:not([data-input-index])');
        }
        if (!toConnector) return;
        
        const fromPos = Utils.getConnectorPosition(fromConnector, containerRect);
        const toPos = Utils.getConnectorPosition(toConnector, containerRect);
        
        const waypoints = (conn.waypoints || []).map(wp => ({ x: wp.x, y: wp.y }));
        
        const path = svg.querySelector(`path.connection-line[data-connection-index="${connIndex}"]`);
        if (path) {
            path.setAttribute('d', Utils.createConnectionPath(fromPos.x, fromPos.y, toPos.x, toPos.y, waypoints));
        }
    }
    
    handleWaypointEnd() {
        this.draggingWaypoint = null;
        document.removeEventListener('mousemove', this.handleWaypointMove);
        document.removeEventListener('mouseup', this.handleWaypointEnd);
    }
    
    handleWaypointDelete(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const connIndex = parseInt(e.target.getAttribute('data-connection-index'));
        const wpIndex = parseInt(e.target.getAttribute('data-waypoint-index'));
        
        if (isNaN(connIndex) || isNaN(wpIndex)) return;
        
        const conn = this.connections[connIndex];
        if (conn && conn.waypoints) {
            conn.waypoints.splice(wpIndex, 1);
            this.updateConnections();
        }
    }
    
    renderChainButtons() {
        const container = document.getElementById('nodesContainer');
        container.querySelectorAll('.chain-copy-button').forEach(btn => btn.remove());
        
        const chains = this.getAllChains();
        
        chains.forEach(chain => {
            if (chain.length === 0) return;
            
            const lastNode = chain[chain.length - 1];
            const lastNodeElement = document.querySelector(`.node[data-node-id="${lastNode.id}"]`);
            if (lastNodeElement) {
                const rect = lastNodeElement.getBoundingClientRect();
                
                const button = document.createElement('button');
                button.className = 'chain-copy-button';
                button.textContent = 'Copy Chain';
                button.onclick = () => this.copyChainFromNode(lastNode.id);
                button.title = `Copy all ${chain.length} node(s) in this chain`;
                
                button.style.left = (lastNode.x + rect.width + 20) + 'px';
                button.style.top = (lastNode.y + rect.height / 2 - 20) + 'px';
                
                container.appendChild(button);
            }
        });
    }
    
    makeNodeDraggable(nodeElement, node) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        nodeElement.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.tagName === 'BUTTON' ||
                e.target.closest('.connector')) {
                return;
            }
            
            isDragging = true;
            nodeElement.classList.add('dragging');
            startX = e.clientX;
            startY = e.clientY;
            initialX = node.x;
            initialY = node.y;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            node.x = initialX + dx;
            node.y = initialY + dy;
            
            nodeElement.style.left = node.x + 'px';
            nodeElement.style.top = node.y + 'px';
            nodeElement.style.zIndex = 10 + Math.floor(node.y / 10);
            
            this.updateConnections();
            this.renderChainButtons();
            this.updateContainerSize();
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                nodeElement.classList.remove('dragging');
            }
        });
    }
    
    handleConnectorStart(e, nodeId, type, inputIndex = null) {
        e.stopPropagation();
        e.preventDefault();
        
        if (type === 'in') {
            this.connectingFrom = nodeId;
            this.connectingFromInputIndex = inputIndex;
            this.connectingTo = null;
            this.connectingToInputIndex = null;
            
            const existingConnection = this.getIncomingConnection(nodeId, inputIndex);
            if (existingConnection) {
                this.removeConnection(existingConnection.from, nodeId, inputIndex);
                this.render();
                return;
            }
            
            document.addEventListener('mousemove', this.handleConnectorMove);
            document.addEventListener('mouseup', this.handleConnectorEnd);
        }
    }
    
    handleConnectorMove(e) {
        if (this.connectingFrom === null) return;
        
        const container = document.getElementById('nodesContainer');
        const containerRect = container.getBoundingClientRect();
        const currentMouseX = e.clientX - containerRect.left;
        const currentMouseY = e.clientY - containerRect.top;
        
        this.mouseX = currentMouseX;
        this.mouseY = currentMouseY;
        
        let closestConnector = null;
        let minDistance = Infinity;
        this.connectingTo = null;
        this.connectingToInputIndex = null;
        
        document.querySelectorAll('.connector-out').forEach(connector => {
            const connectorNodeId = parseFloat(connector.dataset.nodeId);
            if (connectorNodeId === this.connectingFrom) return;
            
            const pos = Utils.getConnectorPosition(connector, containerRect);
            const distance = Math.sqrt(
                Math.pow(currentMouseX - pos.x, 2) + Math.pow(currentMouseY - pos.y, 2)
            );
            
            if (distance < minDistance && distance < 150) {
                minDistance = distance;
                closestConnector = connector;
                this.connectingTo = connectorNodeId;
                this.connectingToInputIndex = null;
            }
        });
        
        document.querySelectorAll('.connector-out, .connector-in').forEach(conn => {
            conn.classList.remove('connecting');
        });
        if (closestConnector) {
            closestConnector.classList.add('connecting');
        }
        
        const svg = document.getElementById('connectionsSvg');
        const existingTempLine = svg.querySelector('.temp-connection-line');
        if (existingTempLine) {
            existingTempLine.remove();
        }
        
        if (this.connectingFrom !== null) {
            const fromNodeElement = document.querySelector(`.node[data-node-id="${this.connectingFrom}"]`);
            if (fromNodeElement) {
                let fromConnector;
                if (this.connectingFromInputIndex !== null && this.connectingFromInputIndex !== undefined) {
                    fromConnector = fromNodeElement.querySelector(`.connector-in[data-input-index="${this.connectingFromInputIndex}"]`);
                } else {
                    fromConnector = fromNodeElement.querySelector('.connector-in:not([data-input-index])');
                }
                
                if (fromConnector) {
                    const fromPos = Utils.getConnectorPosition(fromConnector, containerRect);
                    
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('class', 'connection-line temp-connection-line');
                    path.setAttribute('d', `M ${this.mouseX} ${this.mouseY} L ${fromPos.x} ${fromPos.y}`);
                    path.setAttribute('stroke', '#ed8936');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke-dasharray', '5,5');
                    svg.appendChild(path);
                }
            }
        }
        
        this.updateConnections();
    }
    
    handleConnectorEnd(e) {
        console.log(`[handleConnectorEnd] connectingFrom: ${this.connectingFrom}, connectingTo: ${this.connectingTo}, inputIndex: ${this.connectingFromInputIndex}`);
        
        if (this.connectingFrom !== null && this.connectingTo !== null) {
            const fromId = this.connectingTo;
            const toId = this.connectingFrom;
            const inputIndex = this.connectingFromInputIndex;
            
            console.log(`[handleConnectorEnd] Creating connection: from ${fromId} to ${toId}, inputIndex: ${inputIndex}`);
            this.addConnection(fromId, toId, inputIndex);
        } else {
            console.log(`[handleConnectorEnd] Connection failed - one or both endpoints null`);
        }
        
        this.connectingFrom = null;
        this.connectingFromInputIndex = null;
        this.connectingTo = null;
        this.connectingToInputIndex = null;
        
        document.removeEventListener('mousemove', this.handleConnectorMove);
        document.removeEventListener('mouseup', this.handleConnectorEnd);
        
        document.querySelectorAll('.connector-out, .connector-in').forEach(conn => {
            conn.classList.remove('connecting');
        });
        
        const svg = document.getElementById('connectionsSvg');
        const existingTempLine = svg.querySelector('.temp-connection-line');
        if (existingTempLine) {
            existingTempLine.remove();
        }
        
        this.render();
    }
    
    updateConnections() {
        const svg = document.getElementById('connectionsSvg');
        const container = document.getElementById('nodesContainer');
        const containerRect = container.getBoundingClientRect();
        
        svg.innerHTML = '';
        
        this.connections.forEach((conn, connIndex) => {
            const fromNode = this.nodeManager.find(conn.from);
            const toNode = this.nodeManager.find(conn.to);
            if (!fromNode || !toNode) return;
            
            const fromNodeElement = document.querySelector(`.node[data-node-id="${conn.from}"]`);
            const toNodeElement = document.querySelector(`.node[data-node-id="${conn.to}"]`);
            if (!fromNodeElement || !toNodeElement) return;
            
            const fromConnector = fromNodeElement.querySelector('.connector-out');
            if (!fromConnector) return;
            
            let toConnector;
            if ((toNode.type === 'triple' || toNode.type === 'magnode' || toNode.type === 'instance') && conn.inputIndex !== undefined) {
                toConnector = toNodeElement.querySelector(`.connector-in[data-input-index="${conn.inputIndex}"]`);
            } else {
                toConnector = toNodeElement.querySelector('.connector-in:not([data-input-index])');
            }
            if (!toConnector) return;
            
            const fromPos = Utils.getConnectorPosition(fromConnector, containerRect);
            const toPos = Utils.getConnectorPosition(toConnector, containerRect);
            
            const isSkipped = toNode.type === 'triple' && conn.inputIndex === (toNode.skipIndex || 0);
            const isActive = toNode.type === 'magnode' && conn.inputIndex === (toNode.activeIndex || 0);
            const isChainInput = toNode.type === 'instance' && conn.inputIndex === 0;
            const isConnecting = (this.connectingFrom === conn.to && this.connectingTo === conn.from);
            
            const waypoints = (conn.waypoints || []).map(wp => ({
                x: wp.x,
                y: wp.y
            }));
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', `connection-line ${isConnecting ? 'connecting' : ''} ${isSkipped ? 'skipped' : ''} ${isActive ? 'active' : ''} ${isChainInput ? 'active' : ''}`);
            path.setAttribute('data-connection-index', connIndex);
            path.setAttribute('d', Utils.createConnectionPath(fromPos.x, fromPos.y, toPos.x, toPos.y, waypoints));
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(path);
            
            waypoints.forEach((wp, index) => {
                const waypointCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                waypointCircle.setAttribute('cx', wp.x);
                waypointCircle.setAttribute('cy', wp.y);
                waypointCircle.setAttribute('r', '8');
                waypointCircle.setAttribute('fill', 'white');
                waypointCircle.setAttribute('stroke', '#667eea');
                waypointCircle.setAttribute('stroke-width', '2');
                waypointCircle.setAttribute('class', 'waypoint');
                waypointCircle.setAttribute('data-connection-index', connIndex);
                waypointCircle.setAttribute('data-waypoint-index', index);
                waypointCircle.setAttribute('style', 'cursor: move; pointer-events: all;');
                waypointCircle.setAttribute('title', 'Drag to move waypoint, right-click to delete');
                
                waypointCircle.addEventListener('mousedown', this.handleWaypointDrag);
                waypointCircle.addEventListener('contextmenu', this.handleWaypointDelete);
                
                svg.appendChild(waypointCircle);
            });
        });
        
        this.setupWaypointHandlers();
        
        if (this.connectingFrom !== null) {
            const fromNodeElement = document.querySelector(`.node[data-node-id="${this.connectingFrom}"]`);
            if (fromNodeElement) {
                let fromConnector;
                if (this.connectingFromInputIndex !== null) {
                    fromConnector = fromNodeElement.querySelector(`.connector-in[data-input-index="${this.connectingFromInputIndex}"]`);
                } else {
                    fromConnector = fromNodeElement.querySelector('.connector-in:not([data-input-index])');
                }
                
                if (fromConnector) {
                    const fromPos = Utils.getConnectorPosition(fromConnector, containerRect);
                    let x2 = this.mouseX, y2 = this.mouseY;
                    
                    if (this.connectingTo !== null) {
                        const targetNodeElement = document.querySelector(`.node[data-node-id="${this.connectingTo}"]`);
                        if (targetNodeElement) {
                            let targetConnector;
                            if (this.connectingToInputIndex !== null) {
                                targetConnector = targetNodeElement.querySelector(`.connector-in[data-input-index="${this.connectingToInputIndex}"]`);
                            } else {
                                targetConnector = targetNodeElement.querySelector('.connector-out');
                            }
                            
                            if (targetConnector) {
                                const targetPos = Utils.getConnectorPosition(targetConnector, containerRect);
                                x2 = targetPos.x;
                                y2 = targetPos.y;
                            }
                        }
                    }
                    
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('class', 'connection-line connecting');
                    path.setAttribute('d', Utils.createConnectionPath(fromPos.x, fromPos.y, x2, y2));
                    path.setAttribute('stroke-linecap', 'round');
                    path.setAttribute('stroke-linejoin', 'round');
                    svg.appendChild(path);
                }
            }
        }
    }
    
    init() {
        this.render();
    }
}

// Global functions for HTML onclick handlers
let app;

function addNode() { app.addNode(); }
function addTripleNode() { app.addTripleNode(); }
function addMagnode() { app.addMagnode(); }
function addInstanceNode() { app.addInstanceNode(); }
function addStage1Generator() { app.addStage1Generator(); }
function addStage2Generator() { app.addStage2Generator(); }
function addStage3Generator() { app.addStage3Generator(); }
function saveData() { app.saveData(); }
function saveAsData() { app.saveAsData(); }
function loadData() { app.loadData(); }
function cycleCopy() { app.cycleCopy(); }

function sanitizeClipboard() {
    const textarea = document.getElementById('clipboardTextarea');
    if (!textarea) {
        console.error('Clipboard textarea not found');
        return;
    }
    
    // Clear the textarea first
    textarea.value = '';
    
    // Show the textarea and focus it - user will paste manually
    showPastePrompt();
    
    // Set up paste event listener (this doesn't require permissions)
    const pasteHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        
        if (pastedText) {
            // Sanitize it
            const sanitized = Utils.sanitizeText(pastedText);
            
            // Copy the sanitized version back
            copySanitizedText(sanitized);
            
            // Hide the textarea
            resetTextarea();
        }
        
        textarea.removeEventListener('paste', pasteHandler);
    };
    
    textarea.addEventListener('paste', pasteHandler, { once: true });
}

function copySanitizedText(sanitized) {
    const textarea = document.getElementById('clipboardTextarea');
    textarea.value = sanitized;
    textarea.select();
    
    // Use execCommand('copy') - this works without permissions when triggered by user gesture
    try {
        const copySuccess = document.execCommand('copy');
        if (copySuccess) {
            showSanitizeFeedback(true);
        } else {
            // If execCommand fails, show the sanitized text so user can copy manually
            textarea.value = sanitized;
            textarea.select();
            alert('Sanitized text is ready. Please copy it manually (Ctrl+C or Cmd+C).');
            showSanitizeFeedback(false);
        }
    } catch (err) {
        // Show the sanitized text so user can copy manually
        textarea.value = sanitized;
        textarea.select();
        alert('Sanitized text is ready. Please copy it manually (Ctrl+C or Cmd+C).');
        showSanitizeFeedback(false);
    }
}

function showPastePrompt() {
    const textarea = document.getElementById('clipboardTextarea');
    
    // Create a modal overlay
    let overlay = document.getElementById('sanitizeOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sanitizeOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        document.body.appendChild(overlay);
    } else {
        overlay.style.display = 'flex';
    }
    
    // Add instruction text (create or show it)
    let instruction = document.getElementById('sanitizeInstruction');
    if (!instruction) {
        instruction = document.createElement('div');
        instruction.id = 'sanitizeInstruction';
        instruction.style.color = 'white';
        instruction.style.marginBottom = '10px';
        instruction.style.textAlign = 'center';
        instruction.style.fontSize = '16px';
        instruction.textContent = 'Paste your content below (Ctrl+V or Cmd+V)';
        overlay.appendChild(instruction);
    } else {
        instruction.style.display = 'block';
        // Make sure it's in the overlay
        if (instruction.parentElement !== overlay) {
            overlay.insertBefore(instruction, overlay.firstChild);
        }
    }
    
    // Move textarea into overlay (if not already there)
    if (textarea.parentElement !== overlay) {
        overlay.appendChild(textarea);
    }
    
    // Style the textarea for the prompt
    textarea.style.position = 'relative';
    textarea.style.width = '600px';
    textarea.style.height = '300px';
    textarea.style.opacity = '1';
    textarea.style.pointerEvents = 'auto';
    textarea.style.zIndex = '10000';
    textarea.style.border = '2px solid #667eea';
    textarea.style.borderRadius = '8px';
    textarea.style.padding = '15px';
    textarea.style.fontSize = '14px';
    textarea.style.backgroundColor = 'white';
    textarea.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    textarea.style.fontFamily = 'inherit';
    textarea.style.resize = 'vertical';
    textarea.placeholder = 'Paste your content here (Ctrl+V or Cmd+V)\n\nThe sanitized version will automatically be copied to your clipboard.';
    
    // Focus the textarea
    setTimeout(() => {
        textarea.focus();
    }, 100);
    
    // Close overlay when clicking outside
    const closeOverlay = (e) => {
        if (e.target === overlay && e.target !== textarea && e.target !== instruction) {
            resetTextarea();
            overlay.removeEventListener('click', closeOverlay);
        }
    };
    overlay.addEventListener('click', closeOverlay);
}

function resetTextarea() {
    const textarea = document.getElementById('clipboardTextarea');
    const overlay = document.getElementById('sanitizeOverlay');
    const instruction = document.getElementById('sanitizeInstruction');
    
    textarea.value = '';
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.zIndex = 'auto';
    textarea.style.border = '';
    textarea.style.borderRadius = '';
    textarea.style.padding = '';
    textarea.style.fontSize = '';
    textarea.style.backgroundColor = '';
    textarea.style.boxShadow = '';
    textarea.style.transform = '';
    textarea.style.fontFamily = '';
    textarea.style.resize = '';
    textarea.placeholder = '';
    
    // Move textarea back to body if needed
    if (overlay && textarea.parentElement === overlay) {
        document.body.appendChild(textarea);
    }
    
    // Hide overlay
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    if (instruction) {
        instruction.style.display = 'none';
    }
}

function showSanitizeFeedback(success) {
    const button = document.querySelector('button[onclick="sanitizeClipboard()"]');
    if (button) {
        const originalText = button.textContent;
        button.textContent = success ? '✓ Sanitized!' : 'Failed';
        button.style.background = success ? '#48bb78' : '#e53e3e';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '#667eea';
        }, 2000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app = App.getInstance();
    app.init();
});

