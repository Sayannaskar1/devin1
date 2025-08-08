// frontend/src/config/webcontainer.js
import { WebContainer } from '@webcontainer/api';

let webcontainerInstance; // Singleton instance

export const getWebContainer = async () => {
    if (!webcontainerInstance) {
        console.log("Booting WebContainer...");
        webcontainerInstance = await WebContainer.boot();
        console.log("WebContainer booted!");
    }
    return webcontainerInstance;
};
