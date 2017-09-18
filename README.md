# Molecule Pagination

[![CircleCI](https://img.shields.io/circleci/project/github/vknabel/molecule-pagination.svg?style=flat-square)](https://circleci.com/gh/vknabel/molecule-pagination)
[![Codecov](https://img.shields.io/codecov/c/github/vknabel/molecule-pagination.svg?style=flat-square)](https://codecov.io/gh/vknabel/molecule-pagination)
[![npm (scoped)](https://img.shields.io/npm/v/@ionic-decorator/molecule-pagination.svg?style=flat-square)](https://www.npmjs.com/package/@molecule/pagination)

The structural `molPagination`-Directive for Angular implements pagination of your data, but keeps you and your layout flexible.
You only need to focus on retrieving all items for your page, an observable indicating when to load the next page and one observable for when to hard-reload all data. Everything else is just your markup!

## Example

The following example is fully functional but relies on Ionic as it already implements pull to refresh and infinite scrolling. The `molPagination` directive will concat each slice of data into a single array of data in the right order.
```typescript
@Component({
  template: `
  <ion-content>
    <!-- Pull to refresh -->
    <ion-refresher (ionRefresh)="shouldReload($event)">
      <ion-refresher-content></ion-refresher-content>
    </ion-refresher>


    <!-- Now let's use our directive -->
    <ion-list *molPagination="itemsForPage; let allItems; ifLoading loadingRef; ifEmpty emptyRef; loadNext willLoadNext; hardReload willHardReload">
      <!-- On Success -->
      <!-- We can iterate over all items -->
      <ion-item *ngFor="let item of allItems">
        {{myItem}}
      </ion-item>
    </ion-list>

    <!-- Displayed when loading -->
    <ng-template #loadingRef>
      <ion-spinner></ion-spinner>
    </ng-template>

    <!-- Displayed when there are no items at all -->
    <ng-template #emptyRef>
      Zero items
    </ng-template>

    <!-- Infinite scroll -->
    <ion-infinite-scroll (ionInfinite)="shouldLoadNext($event)">
      <ion-infinite-scroll-content></ion-infinite-scroll-content>
    </ion-infinite-scroll>
  </ion-content>
  `
})
@IonicPage()
export class MyItemsPage {
  public readonly willHardReload = new Subject<void>();
  public readonly willLoadNext = new Subject<void>();
  private latestSender = () => void 0;

  public get itemsForPage(): PageLoader<string> {
    return (index, wasForced) => Observable.of([
      `Values for page with index ${index} as array.`,
      `If reload was forced, load from Http, otherwise from cache: ${wasForced}.`
    ])
      .finally(() => this.latestSender()); // stop reload animation
  }

  public shouldReload(sender?: { complete: () => void }): void {
    // store completion handler
    this.latestSender = () => sender && sender.complete();
    // emit hard reload event for pagination
    this.willHardReload.next(void 0);
  }

  public shouldLoadNext(sender?: { complete: () => void }): void {
    // store completion handler
    this.latestSender = () => sender && sender.complete();
    // emit request next page
    this.willLoadNext.next(void 0);
  }
}
```

## Installation

```bash
$ npm install --save @molecule/pagination
```

## Author

Valentin Knabel, [@vknabel](https://twitter.com/vknabel), dev@vknabel.com

## License

@molecule/pagination is available under the [MIT](LICENSE) license.
