import * as React from 'react';
import jss from 'jss';
import { parser, RouteIn } from './';


/// props
export interface Props {
  className?: string;
}


/// state
export interface State {
}


/// component
export default class Menu extends React.Component<Props, State> {

  menu: Array<RouteIn & { title: string }> = [
    { tag: 'Home', title: 'Home' },
    { tag: 'Search', search: '', title: 'Search' },
    { tag: 'Region', region: 'Africa', title: 'Africa' },
    { tag: 'Region', region: 'Americas', title: 'Americas' },
    { tag: 'Region', region: 'Asia', title: 'Asia' },
    { tag: 'Region', region: 'Europe', title: 'Europe' },
    { tag: 'Region', region: 'Oceania', title: 'Oceania' },
  ];

  render() {
    const rootClass = [this.props.className, classes.root].filter(x => !!x).join(' ');
    return (
      <ul className={rootClass}>
	{this.menu.map((route, idx) => (
	  <li key={idx}><a className="no-visited" href={'#' + parser.print(route)}>{route.title}</a></li>
	))}
      </ul>
    );
  }
}


/// styles
export const styles = {
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 0,
    margin: 0,
    '& li': {
      listStyle: 'none',
    }
  },
};
const { classes } = jss.createStyleSheet(styles).attach();
