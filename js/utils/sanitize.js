static sanitize(text) {
    if (!text) return '';
    
    // Remove emojis (comprehensive emoji regex)
    text = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2190}-\u{21FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}-\u{2B55}]|[\u{3030}-\u{303F}]|[\u{FE00}-\u{FE0F}]|[\u{FE30}-\u{FE4F}]/gu, '');
    
    // Remove bullet points (•)
    text = text.replace(/•/g, '');
    
    // Handle em dashes
    // First, handle em dashes followed by newlines (convert to comma)
    text = text.replace(/—\n/g, ',\n');
    text = text.replace(/ —\n/g, ',\n');
    
    // Split text into sentences (ending with .!?)
    const sentenceParts = text.split(/([.!?]\s*)/);
    
    // Process each sentence part
    for (let i = 0; i < sentenceParts.length; i += 2) {
        let sentence = sentenceParts[i];
        if (!sentence) continue;
        
        // Count em dashes with space before (" —")
        const emDashWithSpace = sentence.match(/ —/g);
        const emDashCount = emDashWithSpace ? emDashWithSpace.length : 0;
        
        if (emDashCount >= 2) {
            // Two or more em dashes with space before: replace all with commas
            sentence = sentence.replace(/ —/g, ',');
        } else if (emDashCount === 1) {
            // Single em dash with space before: replace with semicolon
            sentence = sentence.replace(/ —/g, (match, offset, str) => {
                const afterDash = str.substring(offset + match.length);
                const nextChar = afterDash[0];
                const isPunctuation = /[.,!?;:—\-]/.test(nextChar);
                const isWhitespace = /\s/.test(nextChar);
                
                if (isPunctuation || !nextChar) {
                    return ';';
                } else if (isWhitespace) {
                    return ';';
                } else {
                    return '; ';
                }
            });
        }
        
        // Also handle em dashes without space before (like "word—")
        sentence = sentence.replace(/([^\s\n])—(\s|$|[.,!?;:])/g, (match, before, after) => {
            if (/[.,!?;:]/.test(after)) {
                return before + ';';
            } else if (/\s/.test(after) || after === '') {
                return before + ';';
            } else {
                return before + '; ';
            }
        });
        
        sentenceParts[i] = sentence;
    }
    
    text = sentenceParts.join('');
    
    // Split into lines
    let lines = text.split('\n');
    
    // Remove leading spaces from each line and filter out empty lines
    lines = lines.map(line => line.replace(/^\s+/, '')).filter(line => line.trim() !== '');
    
    // Add extra newline between each remaining line
    text = lines.join('\n\n');
    
    // Final pass: catch any remaining em dashes that might have been missed
    // Handle em dashes followed by newlines (convert to comma)
    text = text.replace(/—\n/g, ',\n');
    text = text.replace(/ —\n/g, ',\n');
    // Handle em dashes without space before (catch-all)
    text = text.replace(/([^\s\n])—/g, '$1;');
    // Handle em dashes with space before (catch-all)
    text = text.replace(/ —/g, ';');
    
    // Remove double spaces (replace 2+ spaces with single space)
    text = text.replace(/  +/g, ' ');
    