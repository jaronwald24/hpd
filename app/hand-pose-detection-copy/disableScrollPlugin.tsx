import { Plugin, RenderViewer } from '@react-pdf-viewer/core';

const disableScrollPlugin = () => {
    const renderViewer = (props) => {
        const { slot } = props;

        const applyStyle = (slot) => {
            if (slot && slot.attrs && slot.attrs.style) {
                slot.attrs.style = Object.assign({}, slot.attrs.style, {
                    overflow: 'hidden',
                });
            }
            if (slot.children && Array.isArray(slot.children)) {
                slot.children.forEach(childSlot => applyStyle(childSlot));
            }
        };

        applyStyle(slot);

        return slot;
    };

    return {
        renderViewer,
    };
};

export default disableScrollPlugin;