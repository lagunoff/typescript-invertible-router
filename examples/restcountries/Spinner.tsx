import * as React from 'react';
import jss from 'jss';

// https://codepen.io/joshbader/pen/ojLvKw


/// props
export interface Props {
  className?: string;  
}


/// component
export default function Spinner(props: Props) {
  const rootClass = [props.className, classes.root].filter(x => !!x).join(' ');
  return <div className={rootClass}/>
}


/// styles
export const styles = {
  root: {
    position: 'relative',
    width: 36,
    height: 36,
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
};
const { classes } = jss.createStyleSheet(styles).attach();
