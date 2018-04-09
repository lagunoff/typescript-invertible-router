import * as React from 'react';
import * as ReactDOM from 'react-dom';
import jss from 'jss';
import theme from './theme';


// props
export interface Props {
  className?: string;
  children?: React.ReactNode;
  section: string;
  shadow?: boolean;
}


class TopMenu extends React.Component<Props> {
  render() {
    const { className, children, section, shadow } = this.props;
    const rootClass = [className, classes.root, shadow ? classes.shadow : undefined].filter(x => !!x).join(' ');
    return <div className={rootClass}>
      <div className={classes.siteMenu}>
        <span>lagunoff.github.io</span><span>/{section}</span>
        <svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10l5 5 5-5z"/>
          <path d="M0 0h24v24H0z" fill="none"/>
        </svg>
      </div>
      {children}
    </div>;
  }
}

export default TopMenu;


/// styles
const { spacing: { unit } } = theme;
export const styles = {
  root: {
    width: '100%',
    height: 46,
    background: 'rgba(0,0,0,0.017)',
    borderBottom: 'solid 1px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    padding: [unit, unit * 3],
    boxSizing: 'border-box',
  },

  shadow: {
    boxShadow: '0 1px 1px rgba(0,0,0,0.40)',
    borderBottom: 'none',
  },

  siteMenu: {
    '& > *': {
      verticalAlign: 'middle',
    },
    '& > *:first-child': {
      color: 'rgba(0,0,0,0.57)',
    },
    '& > *:first-child + *': {
      fontWeight: '600',
      borderBottom: `solid 3px rgb(${theme.palette.colors[1][0].join(',')})`,
    },
  },
  
  menu: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 0,
    margin: 0,
    '& li': {
      listStyle: 'none',
      marginLeft: unit * 2,
      '& a': {
        color: 'rgba(0,0,0,0.57) !important',
        fontSize: 13,
        fontWeight: '600 !important',
        borderBottom: 'none',
        '&:hover': {
          color: 'rgba(0,0,0,0.87) !important',
        },
      },
    }
  }
};
const { classes } = jss.createStyleSheet(styles).attach();
