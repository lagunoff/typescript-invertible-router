This example demonstrates how to implement client-side routing in
SPA-application.

### Top-level route transition

`index.tsx` contains `Root` component which goal is to determine which
 page to show depending on current hash-string, initialize required
 data it and then handle each url change. Each route should have
 `component` field with react component that handles this particular
 route. Such component should also satisfy additional constraints
 defined in `Page.tsx`. It should provide static method `initData`
 which is used for both initialization and when the route is
 changed. Its second argument is its previous result can be used to
 reduce number of HTTP-requests, by taking some data from there.

### REST API

This site uses https://restcountries.eu/ free api.
