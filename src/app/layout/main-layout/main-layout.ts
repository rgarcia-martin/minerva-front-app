import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../header/header';
import { SideMenu } from '../side-menu/side-menu';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Header, SideMenu],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {}
