/*
 * Copyright (c) 2020 Juby210 & Lighty
 * Licensed under the Open Software License version 3.0
 */

const { React } = require('powercord/webpack')
const { Flex } = require('powercord/components')

module.exports = (IconStore, IconSelectorIcon) => class IconSelector extends React.PureComponent {
    render() {
        return <Flex
            style={{ '--bf-primary-color': this.props.color, '--bf-secondary-color': this.props.secondaryColor }}
            wrap={Flex.Wrap.WRAP}
        >{Object.keys(IconStore.icons).map(e => <IconSelectorIcon
            iconId={e}
            isSelected={e === this.props.selected}
            onClick={this.props.onIconClicked}
            onIconDeleted={this.props.onIconDeleted}
        />)}</Flex>
    }
}
