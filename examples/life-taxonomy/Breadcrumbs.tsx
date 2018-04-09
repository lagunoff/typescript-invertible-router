import * as React from 'react';
import * as ReactDOM from 'react-dom';
import jss from 'jss';
import theme, { linkStyle } from './theme';
import { parser, RouteOut } from './';


// props
export interface Props {
  className?: string;
  toolbarClassName?: string;
  embeddedClassName?: string;
  breadcrumbs: RouteOut[];
}


// component
class Breadcrumbs extends React.Component<Props> {
  toolbarAnchor: HTMLElement|null = null;
  
  componentWillMount() {
    this.toolbarAnchor = document.getElementById('toolbar_anchor');
  }
  
  render() {
    const { breadcrumbs, className, toolbarClassName, embeddedClassName } = this.props;
    const rootClass = [className, classes.root, ...(this.toolbarAnchor ? [classes.toolbar, toolbarClassName] : [embeddedClassName]) ].filter(x => !!x).join(' ');
    
    const contents = <div className={rootClass}>
      {intersperse(breadcrumbs.map((r, idx) => <a key={idx} href={'#' + parser.print(r)}>{r.title}</a>).reverse(), <span> → </span>)}
    </div>;
    return this.toolbarAnchor ? ReactDOM.createPortal(contents, this.toolbarAnchor) : contents;
           
    function intersperse(xs: React.ReactElement<any>[], x: React.ReactElement<any>): React.ReactElement<any>[] {
      return xs.reduce<React.ReactElement<any>[]>((acc, a, idx) => (idx && acc.push(React.cloneElement(x, { key: 'glue-' + idx })), acc.push(a), acc), []);
    }
  }
}
export default Breadcrumbs;


// styles
const { spacing: { unit } } = theme;
export const styles = {
  root: {
    fontSize: 14,
    ...linkStyle,
  },  
};
const { classes } = jss.createStyleSheet(styles).attach();
