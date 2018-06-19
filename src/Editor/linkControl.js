import React, {Component} from 'react';
import {
  EditorState,
  RichUtils
} from 'draft-js'

class LinkControl extends Component {

  constructor(props) {
    super(props);

    this.state = {
      showURLInput: false,
      urlValue: ''
    };

    this.promptForLink = this._promptForLink.bind(this);
    this.onURLChange = (e) => this.setState({urlValue: e.target.value});
    this.confirmLink = this._confirmLink.bind(this);
    this.onLinkInputKeyDown = this._onLinkInputKeyDown.bind(this);
    this.removeLink = this._removeLink.bind(this);
  }

  render() {
    const {showURLInput} = this.state;
    return (
      <div className="link">
        <button onMouseDown={this.promptForLink}>Add link</button>
        <button onMouseDown={this.removeLink}>Remove link</button>
        {showURLInput ? (
          <div>
            <input
              onChange={this.onURLChange}
              ref="url"
              type="text"
              value={this.state.urlValue}
              onKeyDown={this.onLinkInputKeyDown}
            />
            <button onMouseDown={this.confirmLink}>
              Confirm
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  _promptForLink(e) {
    e.preventDefault();
    const {editorState} = this.props;
    const selection = editorState.getSelection();
    if (!selection.isCollapsed()) {
      const contentState = editorState.getCurrentContent();
      const startKey = editorState.getSelection().getStartKey();
      const startOffset = editorState.getSelection().getStartOffset();
      const blockWithLinkAtBeginning = contentState.getBlockForKey(startKey);
      const linkKey = blockWithLinkAtBeginning.getEntityAt(startOffset);

      let url = '';
      if (linkKey) {
        const linkInstance = contentState.getEntity(linkKey);
        url = linkInstance.getData().url;
      }

      this.setState({
        showURLInput: true,
        urlValue: url,
      }, () => {
        setTimeout(() => this.refs.url.focus(), 0);
      });
    }
  }

  _confirmLink(e) {
    e.preventDefault();
    const {editorState} = this.props;
    const {urlValue} = this.state;
    const contentState = editorState.getCurrentContent();
    const contentStateWithEntity = contentState.createEntity(
      'LINK',
      'MUTABLE',
      {url: urlValue}
    );
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
    const newEditorState = EditorState.set(editorState, { currentContent: contentStateWithEntity });
    this.setState({
      showURLInput: false,
      urlValue: '',
    }, () => {
      this.props.saveEditorState(
        RichUtils.toggleLink( // <- editorState instance
          newEditorState,
          newEditorState.getSelection(),
          entityKey
        )
      );
      setTimeout(() => this.props._editorRef.current.focus(), 0);
    });
  }

  _onLinkInputKeyDown(e) {
    if (e.which === 13) {
      this._confirmLink(e);
    }
  }

  _removeLink(e) {
    e.preventDefault();
    const {editorState} = this.props;
    const selection = editorState.getSelection();
    if (!selection.isCollapsed()) {
      this.props.saveEditorState(RichUtils.toggleLink(editorState, selection, null));
    }
  }

}

export function findLinkEntities(contentBlock, callback, contentState) {
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

export const Link = (props) => {
  const {url} = props.contentState.getEntity(props.entityKey).getData();
  return (
    <a href={url} style={{color: 'red', textDecoration: 'underline'}}>
      {props.children}
    </a>
  );
};


export default LinkControl;
