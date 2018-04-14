This demo shows how `Parser.prototype.parseAll` can be used to
implement simple «breadcrumbs» navigation strategy. `parseAll` differs
from `parse` by the fact that its result contains all routes that were
successfully matched against the input, including those that left some
segments unconsumed.

```ts
const parser = r.oneOf(
  r.tag('Home').path('/'),
  r.tag('Shop').path('/shop'),
  r.tag('Item').path('/shop/item').segment('id', r.nestring),
);

console.log(parser.parse('/shop/item/42'));
// => { tag: 'Item', id: '42' }
console.log(parser.parseAll('/shop/item/42'));
// => [{ tag: 'Item', id: '42' }, { tag: 'Shop' }, { tag: 'Home' }]
console.log(parser.parseAll('/unknown-url'));
// => []
```

If the input didn't match any of the routes, method `parseAll` returns
empty array, otherwise the first element would be the best match (the
one that has less unconsumed segments), then the second best and so
on. In other words, the output has the reverse order compared to the
order breadcrumbs are usually displayed.

Since results of `parseAll` contain only successfully matched routes,
each descendant route has to have a common path prefix with its
parent. This condition restricts the use of `parseAll` as a
breadcrumbs implementation only to these simple cases.

