class FileManager {
    constructor(app) {
        this.app = app;
    }

    createSaveData() {
        return {
            name: this.app.filename || undefined,
            nodes: this.app.nodes,
            connections: this.app.connections,
            totalCopyCount: this.app.totalCopyCount,
            lastCopiedId: this.app.lastCopiedId,
            savedAt: new Date().toISOString()
        };
    }

    saveData() {
        this.app.filename = document.getElementById('filenameInput').value.trim();
        const data = this.createSaveData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const defaultName = this.app.filename || `copycount-${new Date().toISOString().split('T')[0]}`;
        a.download = `${defaultName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async saveAsData() {
        this.app.filename = document.getElementById('filenameInput').value.trim();

        if ('showSaveFilePicker' in window) {
            try {
                const data = this.createSaveData();
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });

                const defaultName = this.app.filename || `copycount-${new Date().toISOString().split('T')[0]}`;
                const handle = await window.showSaveFilePicker({
                    suggestedName: `${defaultName}.json`,
                    types: [{
                        description: 'JSON Files',
                        accept: {'application/json': ['.json']},
                    }],
                });

                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();

                alert('File saved successfully!');
                return;
            } catch (err) {
                console.log('File System Access API failed, falling back to download:', err);
            }
        }

        this.saveData();
    }

    loadData() {
        document.getElementById('fileInput').click();
    }

    normalizeLoadedNode(node, index = 0) {
        console.log(`[normalizeLoadedNode] Loading node:`, node);
        const nodeType = node.type || 'regular';
        const nodeId = node.id || Date.now() + Math.random() + index;
        const pos = {
            x: node.x !== undefined ? node.x : Math.random() * 400 + 50,
            y: node.y !== undefined ? node.y : Math.random() * 300 + 50
        };
        
        const options = {
            text: node.text || '',
            title: node.title || '',
            allowSplit: node.allowSplit !== undefined ? node.allowSplit : true
        };
        
        // Create proper node instance using NodeManager
        const nodeInstance = this.app.nodeManager.create(nodeType, pos.x, pos.y, options);
        nodeInstance.id = nodeId; // Preserve original ID
        nodeInstance.copyCount = node.copyCount || 0;
        
        // Set type-specific properties
        if (nodeType === 'triple') {
            nodeInstance.skipIndex = node.skipIndex !== undefined ? node.skipIndex : 0;
        } else if (nodeType === 'magnode') {
            nodeInstance.inputCount = node.inputCount !== undefined ? node.inputCount : 2;
            nodeInstance.activeIndex = node.activeIndex !== undefined ? node.activeIndex : 0;
        } else if (nodeType === 'instance') {
            nodeInstance.inputCount = 2;
        }
        
        console.log(`[normalizeLoadedNode] Created ${nodeType} node instance:`, nodeInstance);
        return nodeInstance;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.nodes && Array.isArray(data.nodes)) {
                    console.log(`[handleFileSelect] ========== START LOADING ==========`);
                    console.log(`[handleFileSelect] Loading ${data.nodes.length} nodes`);
                    
                    // Clear existing nodes and keep single source of truth
                    this.app.nodeManager.nodes = [];
                    this.app.nodes = this.app.nodeManager.nodes;
                    
                    // Load nodes (normalizeLoadedNode adds to nodeManager via create)
                    data.nodes.forEach((node, index) => this.normalizeLoadedNode(node, index));
                    console.log(`[handleFileSelect] Loaded ${this.app.nodes.length} nodes into nodeManager`);
                    console.log(`[handleFileSelect] Node IDs:`, this.app.nodes.map(n => ({id: n.id, type: n.type})));
                    
                    // Load connections
                    console.log(`[handleFileSelect] Loading ${data.connections?.length || 0} connections`);
                    this.app.connections = (data.connections || []).map(conn => {
                        const connObj = {
                            ...conn,
                            waypoints: conn.waypoints || []
                        };
                        console.log(`[handleFileSelect] Loading connection:`, {from: connObj.from, to: connObj.to, inputIndex: connObj.inputIndex});
                        return connObj;
                    });
                    this.app.connectionManager.connections = this.app.connections;
                    console.log(`[handleFileSelect] Loaded ${this.app.connections.length} connections into connectionManager`);
                    console.log(`[handleFileSelect] Connection details:`, this.app.connections.map(c => ({from: c.from, to: c.to, inputIndex: c.inputIndex})));
                    console.log(`[handleFileSelect] ========== END LOADING ==========`);
                } else if (data.columns && Array.isArray(data.columns)) {
                    this.app.nodeManager.nodes = [];
                    this.app.nodes = this.app.nodeManager.nodes;
                    this.app.connections = [];
                    let xOffset = 50;
                    data.columns.forEach((column, colIndex) => {
                        column.blurbs.forEach((blurb, blurbIndex) => {
                            const nodeId = blurb.id || Utils.createNodeId() + blurbIndex;
                            this.normalizeLoadedNode({
                                id: nodeId,
                                x: xOffset + colIndex * 320,
                                y: 50 + blurbIndex * 200,
                                text: blurb.text || '',
                                copyCount: blurb.copyCount || 0,
                                title: blurb.title || '',
                                allowSplit: blurb.allowSplit
                            }, blurbIndex);
                            
                            if (blurbIndex > 0) {
                                const prevNodeId = column.blurbs[blurbIndex - 1].id;
                                if (prevNodeId) {
                                    this.app.connections.push({ from: prevNodeId, to: nodeId });
                                }
                            }
                        });
                    });
                } else if (data.blurbs && Array.isArray(data.blurbs)) {
                    this.app.nodeManager.nodes = [];
                    this.app.nodes = this.app.nodeManager.nodes;
                    data.blurbs.forEach((blurb, index) => this.normalizeLoadedNode({
                        ...blurb,
                        x: 50 + (index % 3) * 320,
                        y: 50 + Math.floor(index / 3) * 200
                    }, index));
                    this.app.connections = [];
                } else {
                    alert('Invalid file format');
                    return;
                }

                // Always sync connectionManager with latest array
                this.app.connectionManager.connections = this.app.connections;

                if (data.totalCopyCount !== undefined) {
                    this.app.totalCopyCount = data.totalCopyCount;
                }
                if (data.lastCopiedId !== undefined) {
                    this.app.lastCopiedId = data.lastCopiedId;
                }
                if (data.name !== undefined) {
                    this.app.filename = data.name;
                    document.getElementById('filenameInput').value = this.app.filename;
                }
                this.app.render();
            } catch (err) {
                console.error('Error loading file:', err);
                alert('Failed to load file. Please check the file format.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
}

