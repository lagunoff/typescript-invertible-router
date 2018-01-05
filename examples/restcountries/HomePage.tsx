import * as React from 'react';
import jss from 'jss';
import { parser } from './';
import pageComponent from './Page';
const readme = require('./README.md');


/// Data
export type Data = null;


/// Props
export interface Props {
  route: { tag: 'Home' };
  data: Data;
}


/// State
export interface State {
  search: string;
}


/// component
@pageComponent()
class HomePage extends React.Component<Props, State> {

  static initData(route: Props['route']): Promise<Data> {
    return Promise.resolve(null);
  }

  render() {
    return <div className={classes.root}>
      <div  dangerouslySetInnerHTML={{ __html: readme }}/>
    </div>;
  }
}
export default HomePage;


/// styles
export const styles = {
  root: {
    '& pre': {
      borderLeft: 'solid 4px rgba(0,0,0,0.08)',
      padding: [0, 0, 0, 16],
    },
    '& code': {
      background: 'rgba(0,0,0,0.06)',
      padding: [2, 3],
      borderRadius: 1.5,
    },
    '& p': {
      lineHeight: '1.15em',
    },
  },
};
const { classes } = jss.createStyleSheet(styles).attach();
