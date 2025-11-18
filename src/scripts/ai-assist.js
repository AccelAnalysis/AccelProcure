import { showToast } from './shared.js';
import { 
  generateProposal, 
  generateResponse, 
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

    // Handle different editor types
    if (editor.tagName === 'TEXTAREA' || editor.isContentEditable) {
      return {
        content: editor.value || editor.textContent,
        selection: this.getSelectionInfo(editor),
        type: editor.dataset.editorType || 'text'
      };
    }

    // Handle rich text editors (like TinyMCE, Quill, etc.)
    if (window.tinymce && window.tinymce.get(editorId)) {
      const tinyMce = window.tinymce.get(editorId);
      return {
        content: tinyMce.getContent(),
        selection: tinyMce.selection.getContent(),
        type: 'richtext'
      };
    }

    return {};
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
      showToast('AI is already processing a request', 'info');
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
        default:
          throw new Error(`Unknown AI action: ${action}`);
      }

      this.applyResultToEditor(editorId, result, action);
      showToast('AI assistance applied successfully', 'success');
    } catch (error) {
      console.error('AI Assist Error:', error);
      showToast(`AI Error: ${error.message}`, 'error');
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
    return await generateProposal(rfxId, rest);
  }

  async generateResponse(context) {
    const { rfxId, ...rest } = context;
    if (!rfxId) {
      throw new Error('RFX ID is required to generate a response');
    }
    return await generateResponse(rfxId, rest);
  }

  applyResultToEditor(editorId, result, action) {
    const editor = document.getElementById(editorId);
    if (!editor) return;

    // Handle different editor types
    if (editor.tagName === 'TEXTAREA') {
      const selection = this.getSelectionInfo(editor);
      const before = editor.value.substring(0, selection.start);
      const after = editor.value.substring(selection.end);
      
      // For textareas, just replace the selected text with the result
      editor.value = before + result + after;
      
      // Trigger change event
      const event = new Event('input', { bubbles: true });
      editor.dispatchEvent(event);
      
      // Set cursor position
      const newPosition = (before + result).length;
      editor.setSelectionRange(newPosition, newPosition);
      
    } else if (editor.isContentEditable) {
      // For contenteditable divs
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Create a new text node with the result
        const textNode = document.createTextNode(result);
        
        // Delete the current selection
        range.deleteContents();
        
        // Insert the new content
        range.insertNode(textNode);
        
        // Move cursor to the end of the inserted content
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        
        // Clear any existing selections and add the new range
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event
        const event = new Event('input', { bubbles: true });
        editor.dispatchEvent(event);
      }
    } else if (window.tinymce && window.tinymce.get(editorId)) {
      // Handle TinyMCE editor
      const tinyMce = window.tinymce.get(editorId);
      tinyMce.setContent(result);
    }
    
    // Focus the editor
    editor.focus();
  }

  showLoading(editorId, isLoading) {
    const container = document.querySelector(`#${editorId}`).parentNode.querySelector('.ai-assist-container');
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
}

// Initialize AI Assist when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on a page with AI-assisted editors
  if (document.querySelector('[data-ai-editor]')) {
    window.aiAssist = new AIAssist();
  }
});

export default AIAssist;