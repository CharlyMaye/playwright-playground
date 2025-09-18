import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-material-main-page',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './main.page.html',
  styleUrl: './main.page.scss',
})
export class MaterialMainPage {}
