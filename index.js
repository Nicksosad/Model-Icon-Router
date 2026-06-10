import {
    chat,
    createModelIcon,
    eventSource,
    event_types,
    saveChatConditional,
    updateMessageBlock,
} from '../../../../script.js';
import { SVGInject } from '../../../../lib.js';

const DEFAULT_RULES_TEXT = [
    'claude,anthropic => claude',
    'deepseek => deepseek',
    'mistral => mistralai',
    'grok,xai => xai',
    'kimi => kimi',
    'glm,zai => glm',
    'cohere,command-r => cohere',
    'perplexity,sonar => perplexity',
    'azure => azure_openai',
    'gemini,google,gemma,learnlm => gemini',
].join('\n');
const CUSTOM_ICON_SOURCES = {
    claude: new URL('./assets/claude.svg', import.meta.url).href,
    gemini: new URL('./assets/gemini.svg', import.meta.url).href,
    kimi: new URL('./assets/kimi.svg', import.meta.url).href,
    glm: new URL('./assets/glm.svg', import.meta.url).href,
};

const state = {
    observer: null,
    saveTimer: null,
};

function parseRules() {
    return DEFAULT_RULES_TEXT
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const [left, right] = line.split('=>').map(part => part?.trim());
            if (!left || !right) return null;
            const keywords = left.split(',').map(keyword => keyword.trim().toLowerCase()).filter(Boolean);
            const api = right.toLowerCase().replace(/[^a-z0-9_-]/g, '');
            return keywords.length && api ? { keywords, api } : null;
        })
        .filter(Boolean);
}

function matchApi(modelName) {
    const model = String(modelName || '').toLowerCase();
    if (!model) return '';

    for (const rule of parseRules()) {
        if (rule.keywords.some(keyword => model.includes(keyword))) {
            return rule.api;
        }
    }

    return '';
}

function normalizeMessage(message) {
    if (!message || message.is_user) return false;
    const model = message.extra?.model;
    const api = matchApi(model);
    if (!api || message.extra?.api === api) return false;

    message.extra = message.extra && typeof message.extra === 'object' ? message.extra : {};
    message.extra.api = api;
    return true;
}

function updateMessageDom(messageId, message) {
    const messageElement = document.querySelector(`.mes[mesid="${messageId}"]`);
    if (!messageElement || !message?.extra?.api) return;

    const title = `${message.extra.api} - ${message.extra.model || ''}`;
    messageElement.querySelector('.timestamp')?.setAttribute('title', title);
    replaceIcon(messageElement, message.extra, 'timestamp-icon', '.timestamp', false);
    replaceIcon(messageElement, message.extra, 'thinking-icon', '.mes_reasoning_header_title', true);
}

function replaceIcon(messageElement, extra, className, targetSelector, insertBefore) {
    const target = messageElement.querySelector(targetSelector);
    if (!target) return;

    const image = createModelIcon(extra.api, extra.model);
    if (CUSTOM_ICON_SOURCES[extra.api]) {
        image.src = CUSTOM_ICON_SOURCES[extra.api];
    }
    image.classList.add(className);
    image.onload = async () => {
        const existing = insertBefore
            ? target.previousElementSibling?.classList?.contains(className) && target.previousElementSibling
            : target.nextElementSibling?.classList?.contains(className) && target.nextElementSibling;

        if (existing) {
            existing.replaceWith(image);
        } else if (insertBefore) {
            target.before(image);
        } else {
            target.after(image);
        }

        await SVGInject(image);
    };
}

function queueSave() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
        saveChatConditional().catch(error => console.warn('[Model Icon Router] Failed to save chat:', error));
    }, 1000);
}

function processMessage(messageId, { rerender = false } = {}) {
    const message = chat?.[messageId];
    if (!normalizeMessage(message)) {
        updateMessageDom(messageId, message);
        return false;
    }

    if (rerender) {
        updateMessageBlock(messageId, message, { rerenderMessage: false });
    } else {
        updateMessageDom(messageId, message);
    }

    queueSave();
    return true;
}

function processAll({ rerender = false } = {}) {
    if (!Array.isArray(chat)) return;
    chat.forEach((_, index) => processMessage(index, { rerender }));
}

function startObserver() {
    state.observer?.disconnect();
    state.observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                const messageElement = node.matches?.('.mes') ? node : node.querySelector?.('.mes');
                const messageId = Number(messageElement?.getAttribute('mesid'));
                if (Number.isInteger(messageId)) processMessage(messageId);
            }
        }
    });

    const chatElement = document.getElementById('chat');
    if (chatElement) {
        state.observer.observe(chatElement, { childList: true, subtree: true });
    }
}

function init() {
    startObserver();

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, messageId => {
        processMessage(Number(messageId));
    });
    eventSource.on(event_types.MESSAGE_RECEIVED, messageId => {
        processMessage(Number(messageId), { rerender: true });
    });
    eventSource.on(event_types.CHAT_CHANGED, () => {
        setTimeout(() => {
            startObserver();
            processAll();
        }, 250);
    });
    eventSource.on(event_types.CHAT_LOADED, () => setTimeout(() => processAll(), 250));

    setTimeout(() => processAll(), 500);
    window.ModelIconRouter = { processAll, processMessage, matchApi };
}

jQuery(init);
