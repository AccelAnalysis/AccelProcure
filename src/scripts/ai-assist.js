import { showError, showSuccess } from './shared.js';
import {
  generateProposal as requestProposal,
  generateResponse as requestResponse,
  suggestMatches,
  getRfxAnalysis,
  getMarketInsights
} from '../services/aiService.js';

class AIAssist {
  constructor() {
    this.isLoading = false;
    this.activeEditors = new Set();
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Listen for AI assist button clicks
    document.addEventListener('click', (e) => {
      const aiButton = e.target.closest('[data-ai-action]');
      if (!aiButton) return;

      e.preventDefault();
      
      const action = aiButton.dataset.aiAction;
      const editorId = aiButton.dataset.editorId || 'default';
      const context = this.getEditorContext(editorId);
      
      this.handleAIAction(action, context, editorId);
    });

    // Initialize any existing AI-enabled editors
    this.initializeEditors();
  }

  initializeEditors() {
    // Find all AI-enabled editors on the page
    const editors = document.querySelectorAll('[data-ai-editor]');
    
    editors.forEach(editor => {
      const editorId = editor.id || `editor-${this.activeEditors.size + 1}`;
      this.activeEditors.add(editorId);
      
      // Initialize any editor-specific functionality
      this.initializeEditor(editor, editorId);
    });
  }

  initializeEditor(editorElement, editorId) {
    // Add a unique ID if one doesn't exist
    if (!editorElement.id) {
      editorElement.id = editorId;
    }

    // Add AI assist button if it doesn't exist
    if (!editorElement.querySelector('.ai-assist-button')) {
      const button = document.createElement('button');
      button.className = 'ai-assist-button';
      button.dataset.aiAction = 'improve';
      button.dataset.editorId = editorId;
      button.title = 'Get AI assistance';
      button.innerHTML = '✨ AI Assist';
      
      const container = document.createElement('div');
      container.className = 'ai-assist-container';
      container.appendChild(button);
      
      // Add loading indicator
      const loader = document.createElement('div');
      loader.className = 'ai-assist-loader hidden';
      container.appendChild(loader);
      
      editorElement.parentNode.insertBefore(container, editorElement.nextSibling);
    }
  }

  getEditorContext(editorId) {
    const editor = document.getElementById(editorId);
    if (!editor) return {};

    const dataset = editor.dataset || {};
    const baseContext = {
      content: editor.value || editor.textContent,
      selection: this.getSelectionInfo(editor),
      type: dataset.editorType || 'text',
      rfxId: dataset.rfxId || editor.closest('[data-rfx-id]')?.dataset.rfxId,
      industry: dataset.industry || dataset.industryCode || editor.closest('[data-industry-code]')?.dataset.industryCode,
      filters: dataset.aiFilters ? this.safeParse(dataset.aiFilters) : undefined,
    };

    if (editor.tagName === 'TEXTAREA' || editor.isContentEditable) {
      return baseContext;
    }

    if (window.tinymce && window.tinymce.get(editorId)) {
      const tinyMce = window.tinymce.get(editorId);
      return {
        ...baseContext,
        content: tinyMce.getContent(),
        selection: tinyMce.selection.getContent(),
        type: 'richtext'
      };
    }

    return baseContext;
  }

  getSelectionInfo(editor) {
    if (editor.isContentEditable) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        return {
          text: range.toString(),
          startOffset: range.startOffset,
          endOffset: range.endOffset,
          node: range.startContainer
        };
      }
    } else if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
      return {
        text: editor.value.substring(editor.selectionStart, editor.selectionEnd),
        start: editor.selectionStart,
        end: editor.selectionEnd
      };
    }
    return {};
  }

  async handleAIAction(action, context, editorId) {
    if (this.isLoading) {
      showError('AI is already processing a request');
      return;
    }

    this.isLoading = true;
    this.showLoading(editorId, true);

    try {
      let result;
      
      switch (action) {
        case 'improve':
          result = await this.improveContent(context);
          break;
        case 'expand':
          result = await this.expandContent(context);
          break;
        case 'summarize':
          result = await this.summarizeContent(context);
          break;
        case 'generate-proposal':
          result = await this.generateProposal(context);
          break;
        case 'generate-response':
          result = await this.generateResponse(context);
          break;
        case 'suggest-matches':
          result = await this.getMatchSuggestions(context);
          break;
        case 'analyze-rfx':
          result = await this.analyzeRfx(context);
          break;
        case 'market-insights':
          result = await this.fetchMarketInsights(context);
          break;
        default:
          throw new Error(`Unknown AI action: ${action}`);
      }

      this.applyResultToEditor(editorId, result, action);
      showSuccess('AI assistance applied successfully');
    } catch (error) {
      console.error('AI Assist Error:', error);
      showError(`AI Error: ${error.message}`);
    } finally {
      this.isLoading = false;
      this.showLoading(editorId, false);
    }
  }

  async improveContent(context) {
    // Call the AI service to improve the content
    const response = await fetch('/api/ai/improve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        content: context.content,
        instruction: 'Improve the clarity, conciseness, and professionalism of this text.',
        tone: 'professional',
        format: context.type || 'text'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to improve content');
    }

    const data = await response.json();
    return data.improvedContent || data.text || '';
  }

  async expandContent(context) {
    // Call the AI service to expand the content
    const response = await fetch('/api/ai/expand', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        content: context.content,
        instruction: 'Expand on this content with more details and examples.',
        format: context.type || 'text'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to expand content');
    }

    const data = await response.json();
    return data.expandedContent || data.text || '';
  }

  async summarizeContent(context) {
    // Call the AI service to summarize the content
    const response = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        content: context.content,
        length: 'concise', // 'short', 'medium', 'long'
        format: 'bullets' // 'paragraph', 'bullets', 'numbered'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to summarize content');
    }

    const data = await response.json();
    return data.summary || data.text || '';
  }

  async generateProposal(context) {
    const { rfxId, ...rest } = context;
    if (!rfxId) {
      throw new Error('RFX ID is required to generate a proposal');
    }
    return await requestProposal(rfxId, rest);
  }

  async generateResponse(context) {
    const { rfxId, ...rest } = context;
    if (!rfxId) {
      throw new Error('RFX ID is required to generate a response');
    }
    return await requestResponse(rfxId, rest);
  }

  applyResultToEditor(editorId, result, action) {
    const structuredActions = new Set(['suggest-matches', 'analyze-rfx', 'market-insights']);
    if (structuredActions.has(action)) {
      const outputTarget = this.getOutputTarget(editorId);
      if (outputTarget) {
        outputTarget.innerHTML = this.formatStructuredResult(action, result);
        outputTarget.classList.remove('hidden');
      } else {
        console.table(result);
      }
      return;
    }

    const editor = document.getElementById(editorId);
    if (!editor) return;

    if (editor.tagName === 'TEXTAREA') {
      const selection = this.getSelectionInfo(editor);
      const before = editor.value.substring(0, selection.start);
      const after = editor.value.substring(selection.end);
      editor.value = before + result + after;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      const newPosition = (before + result).length;
      editor.setSelectionRange(newPosition, newPosition);
    } else if (editor.isContentEditable) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(result);
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else if (window.tinymce && window.tinymce.get(editorId)) {
      window.tinymce.get(editorId).setContent(result);
    }

    editor.focus();
  }

  showLoading(editorId, isLoading) {
    const editor = document.getElementById(editorId);
    if (!editor) return;
    const container = editor.parentNode?.querySelector('.ai-assist-container');
    if (!container) return;

    const button = container.querySelector('.ai-assist-button');
    const loader = container.querySelector('.ai-assist-loader');

    if (isLoading) {
      button.disabled = true;
      loader.classList.remove('hidden');
    } else {
      button.disabled = false;
      loader.classList.add('hidden');
    }
  }

  getMatchSuggestions(context) {
    const rfxId = context.rfxId;
    if (!rfxId) {
      throw new Error('RFX ID is required to suggest matches');
    }
    return suggestMatches(rfxId, context.filters || {});
  }

  analyzeRfx(context) {
    if (!context.rfxId) {
      throw new Error('RFX ID is required for AI analysis');
    }
    return getRfxAnalysis(context.rfxId);
  }

  fetchMarketInsights(context) {
    const industry = context.industry;
    if (!industry) {
      throw new Error('Industry context required for market insights');
    }
    return getMarketInsights(industry);
  }

  getOutputTarget(editorId) {
    return (
      document.querySelector(`[data-ai-output="${editorId}"]`) ||
      document.getElementById(`${editorId}-ai-output`) ||
      document.querySelector('[data-ai-output-default]')
    );
  }

  formatStructuredResult(action, data) {
    if (!data) {
      return '<p class="text-muted">No insights available.</p>';
    }

    if (action === 'suggest-matches') {
      const matches = Array.isArray(data) ? data : data.matches || [];
      if (!matches.length) {
        return '<p class="text-muted">No matches available.</p>';
      }
      return `
        <ul class="ai-match-list">
          ${matches
            .map(match => `
              <li>
                <strong>${match.name || match.company || 'Vendor'}</strong>
                ${match.score ? `<span class="badge">${Math.round(match.score)}%</span>` : ''}
                ${match.summary ? `<p>${match.summary}</p>` : ''}
              </li>
            `)
            .join('')}
        </ul>
      `;
    }

    if (action === 'analyze-rfx') {
      return this.formatKeyValueList(data.summary || data);
    }

    if (action === 'market-insights') {
      return this.formatKeyValueList(data.insights || data);
    }

    return this.formatKeyValueList(data);
  }

  formatKeyValueList(payload) {
    if (typeof payload === 'string') {
      return `<p>${payload}</p>`;
    }

    if (Array.isArray(payload)) {
      return `
        <ul>
          ${payload.map(item => `<li>${typeof item === 'string' ? item : JSON.stringify(item)}</li>`).join('')}
        </ul>
      `;
    }

    if (typeof payload === 'object') {
      return `
        <dl>
          ${Object.entries(payload)
            .map(([key, value]) => `
              <dt>${this.formatLabel(key)}</dt>
              <dd>${typeof value === 'object' ? JSON.stringify(value) : value}</dd>
            `)
            .join('')}
        </dl>
      `;
    }

    return `<p>${String(payload)}</p>`;
  }

  formatLabel(label) {
    return label
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase());
  }

  safeParse(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return undefined;
    }
  }
}

// Initialize AI Assist when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on a page with AI-assisted editors
  if (document.querySelector('[data-ai-editor]')) {
    window.aiAssist = new AIAssist();
  }
});

export default AIAssist;