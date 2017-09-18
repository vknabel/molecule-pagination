import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationDirective } from './pagination.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [PaginationDirective],
  exports: [PaginationDirective]
})
export class PaginationModule {}
