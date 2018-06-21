import React, { Component } from 'react';
import {
  EditorState,
  RichUtils,
  getDefaultKeyBinding,
  convertToRaw,
  convertFromRaw,
  Modifier
} from 'draft-js';
import Editor from 'draft-js-plugins-editor';
import createMentionPlugin, { defaultSuggestionsFilter } from 'draft-js-mention-plugin';
import createInlineToolbarPlugin from 'draft-js-inline-toolbar-plugin';
import createLinkPlugin from 'draft-js-anchor-plugin';
import BlockStyleControls from './blockStyleControls';
import InlineStyleControls from './inlineStyleControls';
import mentions from './mentions';
import {
  draftToMarkdown as _draftToMarkdown,
  markdownToDraft as _markdownToDraft
} from 'markdown-draft-js';
import 'draft-js/dist/Draft.css';
import 'draft-js-mention-plugin/lib/plugin.css';
import 'draft-js-anchor-plugin/lib/plugin.css';
import 'draft-js-inline-toolbar-plugin/lib/plugin.css';


function findLinkEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      if (!entityKey) return false;
      if (contentState.getEntity(entityKey).getType() === "LINK") {
        return true;
      };
    },
    callback
  );
}

const Link = (props) => {
  const {url} = props.contentState.getEntity(props.entityKey).getData();
  return (
    <a href={url} style={{color: 'red', textDecoration: 'underline'}}>
      {props.children}
    </a>
  );
};


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

const mentionPlugin = createMentionPlugin();
const linkPlugin = createLinkPlugin({
  placeholder: 'http://…'
});
const inlineToolbarPlugin = createInlineToolbarPlugin({
  theme: {
    buttonStyles: {
      button: 'inline-toolbar-button',
      buttonWrapper: 'inline-toolbar-button-wrapper',
      active: 'inline-toolbar-button-active',
    },
    toolbarStyles: {
      toolbar: 'inline-toolbar'
    }
  },
  structure: [
    linkPlugin.LinkButton
  ]
});
const plugins = [mentionPlugin, inlineToolbarPlugin, linkPlugin];
const { MentionSuggestions } = mentionPlugin;
const { InlineToolbar } = inlineToolbarPlugin;

class MyEditor extends Component {

  constructor(props) {
    super(props);

    this.decorators = [
      {
        strategy: findLinkEntities,
        component: Link
      }
    ];

    this.state = {
      editorState: EditorState.createEmpty(),
      suggestions: mentions,
      initialMd: ''
    };

    this._editorRef = React.createRef();
  }

  render() {

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
          <div className={className} onClick={this.focus}>
            <Editor
              plugins={plugins}
              // blockStyleFn={getBlockStyle}
              // customStyleMap={styleMap}
              editorState={editorState}
              handleKeyCommand={this.handleKeyCommand}
              keyBindingFn={this.mapKeyToEditorCommand}
              handlePastedText={this.handlePastedText}
              onChange={this.onChange}
              placeholder="Start typing..."
              ref={this._editorRef}
              spellCheck={false}
              decorators={this.decorators}
            />
            <MentionSuggestions
              onSearchChange={this.onSearchChange}
              suggestions={this.state.suggestions}
              onAddMention={this.onAddMention}
            />
            <InlineToolbar/>
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
    this.setState({ editorState });
    window._r = convertToRaw(editorState.getCurrentContent());
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

  handlePastedText = (text, styles, editorState) => {
    const regexp = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/gi;
    if (text.match(regexp)) {
      let arr;
      const matches = [];
      const edges = [];
      while ((arr = regexp.exec(text)) !== null) {
        matches.push({
          url: arr[0],
          end: regexp.lastIndex,
          start: regexp.lastIndex - arr[0].length
        });
        edges.push(regexp.lastIndex - arr[0].length, regexp.lastIndex);
      }
      console.warn({matches, text});
      if (edges[0] !== 0) edges.unshift(0);
      if (edges[edges.length - 1] !== text.length - 1) edges.push(text.length);

      for (let i = 0; i < edges.length - 1; i++) {
        const chunk = text.substring(edges[i], edges[i + 1]);
        console.log('[CHUNK]: ', chunk);
        if (regexp.test(chunk)) {
          const contentState = this.state.editorState.getCurrentContent();
          const selection = this.state.editorState.getSelection();
          const contentStateWithEntity = contentState.createEntity(
            'LINK',
            'MUTABLE',
            { url: text }
          );
          const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
          const textWithEntity = Modifier.insertText(contentStateWithEntity, selection, text, null, entityKey);
          // editorState = EditorState.push(editorState, textWithEntity, 'insert-link');
          this.setState({
            editorState: EditorState.push(editorState, textWithEntity, 'insert-link')
          }, () => {
            this.focus();
          });
        } else {
          const contentState = this.state.editorState.getCurrentContent();
          const selection = this.state.editorState.getSelection();
          const plainText = Modifier.insertText(contentState, selection, text, null, null);
          // editorState = EditorState.push(editorState, textWithEntity, 'insert-link');
          this.setState({
            editorState: EditorState.push(editorState, plainText, 'insert-text')
          }, () => {
            this.focus();
          });
        }
      }
      return 'handled';
    }

    // if (text.includes('http://')) {
    //   const contentState = editorState.getCurrentContent();
    //   const selection = editorState.getSelection();
    //   const contentStateWithEntity = contentState.createEntity(
    //     'LINK',
    //     'MUTABLE',
    //     { url: text }
    //   );
    //   const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
    //   const textWithEntity = Modifier.insertText(contentStateWithEntity, selection, text, null, entityKey);
    //   this.setState({
    //     editorState: EditorState.push(editorState, textWithEntity, 'insert-link')
    //   }, () => {
    //     this.focus();
    //   });
    //   return 'handled'
    //   /*
    //
    //   + check if text includes URL
    //   + text.split(' ').map(s => s.match(regexp))
    //
    //   */
    // };

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
