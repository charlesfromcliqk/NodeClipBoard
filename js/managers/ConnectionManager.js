class ConnectionManager {
    constructor(connections, nodeManager) {
        this.connections = connections;
        this.nodeManager = nodeManager;
    }
    
    find(predicate) {
        return this.connections.find(predicate);
    }
    
    findAll(predicate) {
        return this.connections.filter(predicate);
    }
    
    hasIncoming(nodeId) {
        return this.find(c => c.to === nodeId && (c.inputIndex === undefined || c.inputIndex === null)) !== undefined;
    }
    
    getNodeInputs(nodeId) {
        console.log(`[ConnectionManager.getNodeInputs] Getting inputs for node ${nodeId}`);
        const inputCount = 3;
        const inputs = [[], [], []];
        this.findAll(c => c.to === nodeId && c.inputIndex !== undefined).forEach(conn => {
            console.log(`[ConnectionManager.getNodeInputs] Found connection:`, {from: conn.from, to: conn.to, inputIndex: conn.inputIndex});
            if (conn.inputIndex >= 0 && conn.inputIndex < inputCount) {
                inputs[conn.inputIndex].push(conn.from);
            }
        });
        console.log(`[ConnectionManager.getNodeInputs] Result:`, inputs);
        return inputs;
    }
    
    getMagnodeInputs(nodeId) {
        console.log(`[ConnectionManager.getMagnodeInputs] Getting inputs for magnode ${nodeId}`);
        const node = this.nodeManager.find(nodeId);
        if (!node || node.type !== 'magnode') {
            console.log(`[ConnectionManager.getMagnodeInputs] Node not found or not magnode, returning empty`);
            return [];
        }
        const inputCount = node.inputCount || 2;
        console.log(`[ConnectionManager.getMagnodeInputs] Input count: ${inputCount}`);
        const inputs = [];
        for (let i = 0; i < inputCount; i++) inputs[i] = [];
        this.findAll(c => c.to === nodeId && c.inputIndex !== undefined).forEach(conn => {
            console.log(`[ConnectionManager.getMagnodeInputs] Found connection:`, {from: conn.from, to: conn.to, inputIndex: conn.inputIndex});
            if (conn.inputIndex >= 0 && conn.inputIndex < inputCount) {
                inputs[conn.inputIndex].push(conn.from);
            }
        });
        console.log(`[ConnectionManager.getMagnodeInputs] Result:`, inputs);
        return inputs;
    }
    
    getInstanceInputs(nodeId) {
        console.log(`[ConnectionManager.getInstanceInputs] Getting inputs for instance node ${nodeId}`);
        const inputs = [[], []];
        this.findAll(c => c.to === nodeId && c.inputIndex !== undefined).forEach(conn => {
            console.log(`[ConnectionManager.getInstanceInputs] Found connection:`, {from: conn.from, to: conn.to, inputIndex: conn.inputIndex});
            if (conn.inputIndex >= 0 && conn.inputIndex < 2) {
                inputs[conn.inputIndex].push(conn.from);
            }
        });
        console.log(`[ConnectionManager.getInstanceInputs] Result:`, inputs);
        return inputs;
    }
    
    add(fromId, toId, inputIndex = null) {
        if (this.find(c => c.from === fromId && c.to === toId && c.inputIndex === inputIndex)) {
            return;
        }
        this.connections.push({ from: fromId, to: toId, inputIndex, waypoints: [] });
    }
    
    remove(fromId, toId, inputIndex = null) {
        console.log(`[ConnectionManager.remove] Removing connection from ${fromId} to ${toId}, inputIndex: ${inputIndex}`);
        const before = this.connections.length;
        
        // Find and remove in place to maintain array reference
        for (let i = this.connections.length - 1; i >= 0; i--) {
            const c = this.connections[i];
            if (inputIndex !== null) {
                if (c.from === fromId && c.to === toId && c.inputIndex === inputIndex) {
                    this.connections.splice(i, 1);
                }
            } else {
                if (c.from === fromId && c.to === toId && (c.inputIndex === undefined || c.inputIndex === null)) {
                    this.connections.splice(i, 1);
                }
            }
        }
        
        console.log(`[ConnectionManager.remove] Removed, connections: ${before} -> ${this.connections.length}`);
    }
    
    removeAllForNode(nodeId) {
        console.log(`[ConnectionManager.removeAllForNode] Removing all connections for node ${nodeId}`);
        const before = this.connections.length;
        
        // Remove in place to maintain array reference
        for (let i = this.connections.length - 1; i >= 0; i--) {
            const c = this.connections[i];
            if (c.from === nodeId || c.to === nodeId) {
                this.connections.splice(i, 1);
            }
        }
        
        console.log(`[ConnectionManager.removeAllForNode] Removed, connections: ${before} -> ${this.connections.length}`);
    }
}

