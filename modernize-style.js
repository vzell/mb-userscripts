function handleShortcuts(e) {
        // ... existing shortcut logic ...

        // Modernized Settings Shortcut: Shift + S
        if (e.shiftKey && e.key === 'S') {
            console.debug("Opening settings dialog via shortcut");
            const currentSettings = {};
            Object.keys(configSchema).forEach(key => {
                if (configSchema[key].type !== 'divider') {
                    currentSettings[key] = GM_getValue(key, configSchema[key].default);
                }
            });

            VZ_MB.openSettings("Show All Entity Data Settings", configSchema, currentSettings, (newValues) => {
                Object.entries(newValues).forEach(([key, val]) => {
                    GM_setValue(key, val);
                });
                console.log("Settings saved. Some changes may require a refresh.");
            });
        }
    }

    document.addEventListener('keydown', handleShortcuts);
