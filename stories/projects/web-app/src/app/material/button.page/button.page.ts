import { Component } from '@angular/core';
import { MatButtonAppearance, MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-button.page',
  imports: [MatTooltip, MatDividerModule, MatButtonModule, MatIconModule],
  templateUrl: './button.page.html',
  styleUrl: './button.page.scss',
})
export class ButtonPage {
  readonly buttonType: MatButtonAppearance[] = ['text', 'filled', 'elevated', 'outlined', 'tonal'];
  readonly imgButtonType: MatButtonAppearance[] = [
    'text',
    'filled',
    'elevated',
    'outlined',
    'tonal',
  ];
}
