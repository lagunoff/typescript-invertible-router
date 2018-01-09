import * as React from 'react';
import jss from 'jss';
import Menu from './Menu';
import Search from './Search';


/// props constraints
export interface RouteProps {
  route: any;
  data: any;
}


/// component that handles particular route
export type RouteComponent<P extends RouteProps> = React.ReactType<P> & {
  initData(route: P['route'], data?: P['data']): Promise<P['data']>;
}


/// component
export default function pageComponent<P extends RouteProps>(initialSearch?: (x: P) => string): <C extends RouteComponent<P>>(Nested: C) => C {
  return Nested => {
    function Component(props) {
      return <div className={classes.root}>
	<div className={classes.menuOverlay}>
	  <Menu className={classes.menu}/>
	</div>
	<div className={classes.content}>
	  <Search initialValue={initialSearch ? initialSearch(props) : ''}/>
	  {React.createElement(Nested, props)}
	</div>
      </div>;
    }
    Object.assign(Component, Nested);
    return Component as any;
  };
}


/// styles
export const styles = {
  content: {
    maxWidth: 500,
    padding: [0, 16],
    margin: [0, 'auto', 24 * 3, 'auto'],
    boxSizing: 'content-box',
  },

  menuOverlay: {
    width: '100%',
    height: 32,
    background: 'rgba(0,0,0,0.017)',
    borderBottom: 'solid 1px rgba(0,0,0,0.05)',
    top: 0,
    left: 0,
    marginBottom: 24,
    boxSizing: 'border-box',
  },

  menu: {
    maxWidth: 500,
    padding: [0, 16],
    margin: [0, 'auto'],
    boxSizing: 'content-box',
    lineHeight: '32px',
    fontSize: 14,
    '& a': { borderBottom: 'none !important', },
  },
};
const { classes } = jss.createStyleSheet(styles).attach();
