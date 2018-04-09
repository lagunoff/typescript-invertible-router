import * as React from 'react';
import jss from 'jss';
import theme from './theme';

// https://codepen.io/joshbader/pen/ojLvKw


// props
export interface Props extends React.HTMLProps<HTMLDivElement> {
  overlay?: boolean; // show overlay
  overlayClass?: string;
}


// component
export default function Spinner(props: Props) {
  const { className, overlay, overlayClass: overlayClassProp, ...rest } = props;
  const spinnerClass = [className, classes.spinner].filter(x => !!x).join(' ');
  const overlayClass = [overlayClassProp, classes.overlay].filter(x => !!x).join(' ');
  const spinner = <div {...rest} className={spinnerClass}/>;
  return overlay ? <div className={overlayClass}>{spinner}</div> : spinner;
}


// styles
export const styles = function (){
  const { spacing: { unit } } = theme;
  return {
    spinner: {
      position: 'relative',
      width: unit * 3.5,
      height: unit * 3.5,
      transform: 'translate(-50%, -50%)',
      border: '0.23em solid #E7DFE7',
      borderRadius: '50%',
      '&:before': {
        content: '""',
        position: 'absolute',
        top: '-0.23em',
        left: '-0.23em',
        display: 'block',
        width: '100%',
        height: '100%',
        border: '0.23em solid transparent',
        borderTopColor: '#fcbe4d',
        borderRadius: '50%',
        animation: 'spin 1.25s ease infinite',
      },
    },

    '@keyframes spin': {
      '100%': { transform: 'rotate(1080deg)' },
    },

    overlay: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
      background: `rgba(255,255,255,0.7)`,
      '& $spinner': {
        top: '50%',
        left: '50%',
      },
    },
  };
}();
const { classes } = jss.createStyleSheet(styles).attach();
