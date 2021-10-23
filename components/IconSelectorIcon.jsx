/*
 * Copyright (c) 2020-2021 Juby210 & Lighty
 * Licensed under the Open Software License version 3.0
 */

const { React, getModule, getModuleByDisplayName } = require('powercord/webpack')

module.exports = async IconStore => {
    const classes = await getModule(['folder', 'folderIconWrapper'])
    const Clickable = await getModuleByDisplayName('Clickable')
    const RemoveButton = await getModuleByDisplayName('RemoveButton')

    return class IconSelectorIcon extends React.PureComponent {
        constructor(props) {
            super(props)
            this.state = {
                hovered: props.forceState ? props.hovered : false,
                showClose: props.onIconDeleted && props.iconId > 7
            }
            _.bindAll(this, ['onMouseEnter', 'onMouseLeave', 'onIconClicked', 'onCloseClicked'])
        }
        onMouseEnter() {
            if (this.props.forceState) return
            this.setState({ hovered: true })
        }
        onMouseLeave() {
            if (this.props.forceState) return
            this.setState({ hovered: false })
        }
        onIconClicked() {
            this.props.onClick(this.props.iconId)
        }
        onCloseClicked() {
            this.props.onIconDeleted(this.props.iconId)
        }
        render() {
            return <Clickable
            className={`BF-icon ${classes.folder} ${this.props.isSelected ? 'BF-icon-selected' : ''} ${this.state.hovered ? 'BF-icon-hovered' : ''}`}
                onMouseEnter={this.onMouseEnter}
                onMouseLeave={this.onMouseLeave}
                onClick={this.onIconClicked}
            >
                <div className={classes.folderIconWrapper}>
                    {Array.isArray(IconStore.icons[this.props.iconId]) ?
                        IconStore.icons[this.props.iconId][this.state.hovered ? 1 : 0] :
                        IconStore.icons[this.props.iconId]}
                </div>
                {this.state.showClose && <RemoveButton className='BF-remove-icon' onClick={this.onCloseClicked} />}
            </Clickable>
        }
    }
}
