class Utils {
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static normalizeText(text) {
        return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    static createNodeId() {
        return Date.now() + Math.random();
    }

    static getRandomPosition(x = null, y = null) {
        return {
            x: x !== null ? x : Math.random() * 400 + 50,
            y: y !== null ? y : Math.random() * 300 + 50
        };
    }

    static createConnectionPath(x1, y1, x2, y2, waypoints = []) {
        if (waypoints.length === 0) {
            // No waypoints: use original curved path
            const dx = Math.abs(x2 - x1);
            const controlOffset = Math.min(dx * 0.5, 100);
            const cp1x = x1 + (x2 > x1 ? controlOffset : -controlOffset);
            const cp1y = y1;
            const cp2x = x2 - (x2 > x1 ? controlOffset : -controlOffset);
            const cp2y = y2;
            return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
        } else {
            // With waypoints: create path through all waypoints
            let path = `M ${x1} ${y1}`;
            let prevX = x1;
            let prevY = y1;
            
            waypoints.forEach((wp, index) => {
                const dx = Math.abs(wp.x - prevX);
                const controlOffset = Math.min(dx * 0.5, 100);
                const cp1x = prevX + (wp.x > prevX ? controlOffset : -controlOffset);
                const cp1y = prevY;
                const cp2x = wp.x - (wp.x > prevX ? controlOffset : -controlOffset);
                const cp2y = wp.y;
                path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${wp.x} ${wp.y}`;
                prevX = wp.x;
                prevY = wp.y;
            });
            
            // Final segment to destination
            const dx = Math.abs(x2 - prevX);
            const controlOffset = Math.min(dx * 0.5, 100);
            const cp1x = prevX + (x2 > prevX ? controlOffset : -controlOffset);
            const cp1y = prevY;
            const cp2x = x2 - (x2 > prevX ? controlOffset : -controlOffset);
            const cp2y = y2;
            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
            
            return path;
        }
    }

    static getConnectorPosition(connector, containerRect) {
        const rect = connector.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top + rect.height / 2 - containerRect.top
        };
    }
}

