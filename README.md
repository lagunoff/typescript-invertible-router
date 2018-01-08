This library helps to implement routing in web-applications. It
provides DSL for declaring routes, declaration then can be used for
both matching urls and printing links to any location inside the
application.

```ts
import * as r from 'typescript-invertible-router';

const parser = r.oneOf(
  r.tag('Shop').path('/shop'),
  r.tag('Category').path('/category').segment('slug', r.string).params({ page: r.nat.withDefault(1) }),
  r.tag('Item').path('/item').segment('id', r.string),
  r.tag('Page404').path('/404'),
);

console.log(parser.parse('/non-existing-url')); // => null
console.log(parser.parse('/shop')); // => { tag: 'Shop' }
console.log(parser.parse('/category/groceries')); // => { tag: 'Category', slug: 'groceries', page: 1 }
console.log(parser.parse('/item/42')); // => { tag: 'Item', id: '42' }

console.log(parser.print({ tag: 'Shop' })); // => "/shop"
console.log(parser.print({ tag: 'Category', slug: 'groceries', page: 2 })); // => "/category/groceries?page=2"
console.log(parser.print({ tag: 'Item', id: '1' })); // => "/item/1"
```

