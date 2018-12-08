import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { PrefixTrie } from '../../src/parser';
import { parser, RouteIn } from './';
import theme, { linkStyle } from './theme';
import jss from 'jss';


// props
export interface Props extends React.HTMLProps<HTMLDivElement> {
  route: RouteIn;
}


// state
interface State {
  visibility: VisibilityTree;
}


/** Multi child tree which nodes represent visible menu items */
interface VisibilityTree {
  [k: string]: VisibilityTree|true;
}


// component
class LifeTreeMenu extends React.Component<Props, State> {
  initialVisibility: VisibilityTree;
  expandAll: VisibilityTree;

  constructor(props: Props) {
    super(props);
    
    /** Expand the first level */
    this.initialVisibility = function () {
      const output: VisibilityTree = {};
      const prefixTree = parser._prefixTrie!;
      for (const k in prefixTree) {
        if (!prefixTree.hasOwnProperty(k) || k === '') continue;
        output[k] = true;
      }
      return output;
    }();

    /** Expand all the nodes */
    this.expandAll = function () {
      const prefixTree = parser._prefixTrie!;
      return go(prefixTree) as VisibilityTree;

      function go(prefixTree: PrefixTrie): VisibilityTree|true {
        const output: VisibilityTree = {};
        let isLeaf = true;
        for (const k in prefixTree) {
          if (!prefixTree.hasOwnProperty(k) || k === '') continue;
          output[k] = go(prefixTree[k] as PrefixTrie);
          isLeaf = false;
        }
        return isLeaf ? true : output;
      }
    }();

    this.state = { visibility: this.initialVisibility };
  }

  toggleNodeVisibility = (segments: string[]) => () => {
    const { visibility } = this.state;
    const root = visibility;
    let iter: VisibilityTree[string]|false = !deepGet(root, segments);
    for (let i = segments.length - 1; i >= 0; i--) {
      const k = segments[i];
      const subSegments = segments.slice(0, i);
      const rest = deepGet(root, subSegments);
      iter = { ...rest, [k]: iter };
      if (!iter[k]) delete iter[k];
    }

    this.setState({ visibility: iter as VisibilityTree });

    function deepGet(o: object, path: string[]): any|undefined {
      let iter = o;
      for (const p of path) {
        if (!iter.hasOwnProperty(p)) return undefined;
        iter = iter[p];
      }
      return iter;
    }
  };

  toggleExpandAll = () => {
    const { visibility } = this.state;
    const visibilityNext = visibility === this.expandAll ? this.initialVisibility : this.expandAll;
    this.setState({ visibility: visibilityNext });
  };  

  /** Using `PrefixTree`-structure to build hierarchical menu */
  renderTree() {
    const self = this;
    const { state } = this;
    const prefixTree = parser._prefixTrie!;
    const svgObjects: React.ReactElement<any>[] = [];
    const svgIcons: React.ReactElement<any>[] = [];
    let yCoords: number = 0;
    let xCoords: number = 0;
    const { spacing: { unit } } = theme;
    const itemHeight = unit * 4;
    const hStep = unit * 3;
    const vStep = unit * 3.5;
    traverseTreeRec(prefixTree, []);
    
    return <React.Fragment>
      <svg xmlns="http://www.w3.org/2000/svg" width={xCoords * hStep + 240} height={yCoords * vStep + unit} shapeRendering="crispEdges" className={classes.svg}>
        <defs>
          <g id="minus" stroke="rgba(0,0,0,0.25)" strokeWidth="1">
            <path d="M0 0 h 8 v 8 h -8 z" fill="#fff"/> 
            <path d="M2 4 h 5" fill="none" strokeWidth="1"/>
          </g>
          <g id="plus" stroke="rgba(0,0,0,0.25)" fill="none" strokeWidth="1">
            <use xlinkHref="#minus"/>
            <path d="M4 2 v 5" stroke="rgba(0,0,0,0.25)" fill="none" strokeWidth="1"/>
          </g>
        </defs>
        <g transform={`translate(0, ${unit})`}>
          {svgObjects}{svgIcons}
        </g>
      </svg>
    </React.Fragment>;

    function traverseTreeRec(prefixTree: PrefixTrie, stack: string[], parentY: number = -1) {
      const route = parser.parse(stack.join('/'));
      const childrenSegments = Object.keys(prefixTree).filter(x => x !== '');
      const hasChildren = !!childrenSegments.length;
      const visible = isVisible(state.visibility, stack);
      const key = yCoords;
      const currentParentY = yCoords;
      const textClass = [classes.text, route && self.props.route.tag === route.tag ? classes.active : undefined].filter(x => !!x).join(' ');
      route && (xCoords = Math.max(xCoords, stack.length - 1));
      // Horizontal dotted line
      route && stack.length > 1 && svgObjects.push(<path key={`path-${key}`} d={`M${(stack.length - 1) * hStep - (unit * 2)} ${yCoords * vStep} h ${unit * 1.7}`} stroke="rgba(0,0,0,0.25)" strokeDasharray="1, 1" strokeWidth="1"/>);
      // Vertical dotted line
      route && stack.length > 1 && (parentY >= 0) && svgObjects.push(<path key={`path-parent-${key}`} d={`M${(stack.length - 1) * hStep - (unit * 2)} ${yCoords * vStep} V ${parentY * vStep + unit} `} stroke="rgba(0,0,0,0.25)" strokeDasharray="1, 1" strokeWidth="1"/>);
      // Fold/unfold icon
      route && stack.length > 1 && hasChildren && svgIcons.push(<use key={`icon-${key}`} xlinkHref={visible ? '#minus' : '#plus'} x={(stack.length - 1) * hStep - 4 - (unit * 2)} y={yCoords * vStep - 4}  onClick={self.toggleNodeVisibility(stack)}/>);
      // @ts-ignore
      route && svgObjects.push(<text className={textClass} x={(stack.length - 1) * hStep} y={yCoords * vStep + (unit * 0.8)} key={`link-${key}`}><a xlinkHref={'#' + parser.print(route)}>{route.title}</a></text>);
      route && yCoords++;
      const children = visible ? childrenSegments.map((key, idx) => {
        return traverseTreeRec(prefixTree[key] as PrefixTrie, stack.concat(key), idx === childrenSegments.length - 1 ? currentParentY : -1);
      }) : [];
      const itemClassName = [classes.item].filter(x => !!x).join(' ');
    }

    function isVisible(visibility: VisibilityTree, path: string[]): boolean {
      let iter = visibility;
      for (const p of path) {
        if (!iter.hasOwnProperty(p)) return false;
        iter = iter[p] as VisibilityTree;
      }
      return true;
    }
  }

  /** Fold/unfold icon */
  renderPlusMinus(expanded: boolean, onClick: () => void) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" shapeRendering="crispEdges" className={classes.plusMinus} onClick={onClick}>
      <path d="M0 0 h 8 v 8 h -8 z" stroke="rgba(0,0,0,0.54)" fill="none" strokeWidth="1"/> 
      <path d="M2 4 h 5" stroke="rgba(0,0,0,0.54)" fill="none" strokeWidth="1"/>
      {!expanded && <path d="M4 2 v 5" stroke="rgba(0,0,0,0.54)" fill="none" strokeWidth="1"/>}
    </svg>;
  }

  render() {
    const { className, route, ...rest } = this.props;
    const { visibility } = this.state;
    const rootClass = [this.props.className, classes.root].filter(x => !!x).join(' ');

    return <div {...rest} className={rootClass}>
      {<a href="javascript://void 0" onClick={this.toggleExpandAll} className={classes.expand}>{visibility === this.expandAll ? 'Collapse all' : 'Expand all'}</a>}
      {this.renderTree()}
    </div>;
  }
}

export default LifeTreeMenu;


// styles
export const styles = function () {
  const { unit } = theme.spacing;
  return {
    root: {
      '& ul': { paddingLeft: 16 },
      '& li': {
        listStyle: 'none',
        margin: [2, 0],
        position: 'relative',
      },
    },

    expand: {
      ...linkStyle['& a'],
      fontSize: 14,
      borderBottomStyle: 'dotted',
    },
    
    item: {
    },

    hidden: {
      visibility: 'hidden',
    },

    plusMinus: {
      marginRight: unit * 0.5,
      cursor: 'pointer',
    },

    active: {
      fontWeight: 600,
    },

    text: {
      // borderBottom: `dotted 1px rgba(0,0,0,0.25)`,
      fontSize: 14,
      cursor: 'pointer',
    },

    svg: {
      marginTop: unit * 2,
    },
  };
}();
const { classes } = jss.createStyleSheet(styles).attach();

