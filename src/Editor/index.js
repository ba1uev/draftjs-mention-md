import React, { Component } from 'react';
import {
  EditorState,
  RichUtils,
  getDefaultKeyBinding,
  convertToRaw,
  convertFromRaw
} from 'draft-js';
import Editor from 'draft-js-plugins-editor';
import createMentionPlugin, { defaultSuggestionsFilter } from 'draft-js-mention-plugin';
import BlockStyleControls from './blockStyleControls';
import InlineStyleControls from './inlineStyleControls';
import LinkControl, {Link, findLinkEntities} from './linkControl';
import mentions from './mentions';
import {
  draftToMarkdown as _draftToMarkdown,
  markdownToDraft as _markdownToDraft
} from 'markdown-draft-js';
import 'draft-js/dist/Draft.css';
import 'draft-js-mention-plugin/lib/plugin.css';


const markdownToDraft = string => _markdownToDraft(string, {
  blockEntities: {
    link_open(item) {
      if (item.href && item.href.startsWith && item.href.startsWith('_user_:')) {
        return {
          type: 'mention',
          mutability: 'SEGMENTED',
          data: {
            mention: {
              id: Number(item.href.split(':')[1])
            }
          }
        }
      }
      return {
        type: 'LINK',
        mutability: 'MUTABLE',
        data: {
          url: item.href
        }
      };
    }
  }
});

const draftToMarkdown = raw => _draftToMarkdown(raw, {
  entityItems: {
    mention: {
      open(entity) {
        return '[';
      },
      close(entity) {
        return `](_user_:${entity.data.mention.id})`;
      }
    }
  }
});



class MyEditor extends Component {

  constructor(props) {
    super(props);

    this.decorators = [
      {
        strategy: findLinkEntities,
        component: Link
      }
    ];

    this.mentionPlugin = createMentionPlugin();

    this.state = {
      editorState: EditorState.createEmpty(),
      suggestions: mentions,
      initialMd: ''
    };

    this._editorRef = React.createRef();
  }

  render() {
    const { MentionSuggestions } = this.mentionPlugin;
    const plugins = [this.mentionPlugin];

    const {editorState, initialMd} = this.state;

    let className = 'RichEditor-editor';
    var contentState = editorState.getCurrentContent();
    if (!contentState.hasText()) {
      if (contentState.getBlockMap().first().getType() !== 'unstyled') {
        className += ' RichEditor-hidePlaceholder';
      }
    }

    return (
      <div className="wrapper">

        <div className="content content-input">
          <h2>Load MD content in Editor</h2>
          <textarea
            spellCheck={false}
            value={initialMd}
            onChange={ev => this.setState({ initialMd: ev.target.value })}
          >
          </textarea>
          <button onClick={this.onLoadMd}>Load MD</button>
        </div>

        <div className="editor">
          <BlockStyleControls
            editorState={editorState}
            onToggle={this.toggleBlockType}
          />
          <InlineStyleControls
            editorState={editorState}
            onToggle={this.toggleInlineStyle}
          />
          <LinkControl
            editorState={editorState}
            saveEditorState={editorState => this.setState({editorState})}
            _editorRef={this._editorRef}
          />
          <div className={className} onClick={this.focus}>
            <Editor
              plugins={plugins}
              // blockStyleFn={getBlockStyle}
              // customStyleMap={styleMap}
              editorState={editorState}
              handleKeyCommand={this.handleKeyCommand}
              keyBindingFn={this.mapKeyToEditorCommand}
              onChange={this.onChange}
              placeholder="Start typing..."
              ref={this._editorRef}
              spellCheck={true}
              decorators={this.decorators}
            />
            <MentionSuggestions
              onSearchChange={this.onSearchChange}
              suggestions={this.state.suggestions}
              onAddMention={this.onAddMention}
            />
          </div>
        </div>

        <div className="content content-output">
          <h2>Current Editor content</h2>
          <textarea
            spellCheck={false}
            value={draftToMarkdown(convertToRaw(editorState.getCurrentContent()))}
          >
          </textarea>
          <button onClick={this.onReset} style={{border: '1px solid red', borderRadius: '4px', background: '#fff', color: 'red'}}>Clear content</button>
        </div>

      </div>
    );
  }

  focus = () => this._editorRef.current.focus();

  onChange = (editorState) => {
    window._s = convertToRaw(editorState.getCurrentContent());
    this.setState({editorState});
  }

  onSearchChange = ({ value }) => {
    this.setState({
      suggestions: defaultSuggestionsFilter(value, mentions),
    });
  }

  onAddMention = () => {
    // get the mention object selected
  }

  handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  mapKeyToEditorCommand = (e) => {
    if (e.keyCode === 9 /* TAB */) {
      const newEditorState = RichUtils.onTab(
        e,
        this.state.editorState,
        4, /* maxDepth */
      );
      if (newEditorState !== this.state.editorState) {
        this.onChange(newEditorState);
      }
      return;
    }
    return getDefaultKeyBinding(e);
  }

  toggleBlockType = (blockType) => {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    );
  }

  toggleInlineStyle = (inlineStyle) => {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  onLoadMd = ev => {
    const contentState = convertFromRaw(markdownToDraft(this.state.initialMd));
    const editorState = EditorState.createWithContent(contentState);
    this.onChange(editorState);
  }

  onReset = ev => {
    const editorState = EditorState.createEmpty();
    this.onChange(editorState);
  }
}

export default MyEditor;
