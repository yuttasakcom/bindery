import h from 'hyperscript';
import { convertStrToPx } from '../utils/convertUnits';
import c from '../utils/prefixClass';

import {
  title,
  select,
  option,
  btn,
  btnMain,
  switchRow,
  row,
  viewMode,
  expandRow,
  expandArea,
  inputNumberUnits,
} from './components';

class ControlPanel {
  constructor(opts) {
    this.binder = opts.binder;
    const viewer = this.binder.viewer;

    const done = () => {
      this.binder.cancel();
    };
    const print = () => {
      viewer.setPrint();
      window.print();
    };

    const printBtn = btnMain({ onclick: print }, 'Print');

    let layoutControl;
    let cropToggle;
    let bleedMarkToggle;
    let facingToggle;

    const toggleCrop = () => {
      viewer.isShowingCropMarks = !viewer.isShowingCropMarks;
      cropToggle.classList.toggle('selected');
    };

    const toggleBleedMarks = () => {
      viewer.isShowingBleedMarks = !viewer.isShowingBleedMarks;
      bleedMarkToggle.classList.toggle('selected');
    };

    const toggleFacing = () => {
      facingToggle.classList.toggle('selected');
      layoutControl.classList.toggle('not-facing');
      viewer.toggleDouble();
    };

    cropToggle = switchRow({ onclick: toggleCrop }, 'Crop Marks');
    cropToggle.classList.add('selected');
    bleedMarkToggle = switchRow({ onclick: toggleBleedMarks }, 'Bleed Marks');
    facingToggle = switchRow({ onclick: toggleFacing }, 'Facing Pages');

    facingToggle.classList.add('selected');

    let doneBtn = '';
    if (!this.binder.autorun) {
      doneBtn = btn({ onclick: done }, 'Done');
    }

    const unitInputs = {
      top: inputNumberUnits(this.binder.pageMargin.top),
      inner: inputNumberUnits(this.binder.pageMargin.inner),
      outer: inputNumberUnits(this.binder.pageMargin.outer),
      bottom: inputNumberUnits(this.binder.pageMargin.bottom),
      width: inputNumberUnits(this.binder.pageSize.width),
      height: inputNumberUnits(this.binder.pageSize.height),
    };

    const sizeControl = h(`.${c('row')}.${c('size')}`,
      h('div', 'W', unitInputs.width),
      h('div', 'H', unitInputs.height),
    );

    const marginPreview = h(c('.preview'));
    const marginControl = h(`.${c('row')}.${c('margin')}`,
      h('.top', unitInputs.top),
      h('.inner', unitInputs.inner),
      h('.outer', unitInputs.outer),
      h('.bottom', unitInputs.bottom),
      marginPreview,
    );

    layoutControl = h(c('.layout-control'),
      sizeControl,
      marginControl
    );

    const paperSize = row('Paper Size', select(
      option('Letter'),
      option({ disabled: true }, '8.5 x 11'),
      option({ disabled: true }, ''),
      option({ disabled: true }, 'Legal'),
      option({ disabled: true }, '8.5 x 14'),
      option({ disabled: true }, ''),
      option({ disabled: true }, 'Tabloid'),
      option({ disabled: true }, '11 x 17'),
      option({ disabled: true }, ''),
      option({ disabled: true }, 'A4'),
      option({ disabled: true }, 'mm x mm'),
    ));

    const arrangeSelect = select(
      option({ value: 'arrange_one' }, 'Pages'),
      option({ value: 'arrange_two', selected: true }, 'Spreads'),
      option({ value: 'arrange_booklet' }, 'Booklet'),
      option({ disabled: true }, 'Grid'),
      option({ disabled: true }, 'Signatures'),
    );
    arrangeSelect.addEventListener('change', () => {
      viewer.setPrintArrange(arrangeSelect.value);
    });
    const arrangement = row('Print', arrangeSelect);

    const orientationSelect = select(
      option({ value: 'landscape' }, 'Landscape'),
      option({ value: 'portrait' }, 'Portrait'),
    );
    orientationSelect.addEventListener('change', () => {
      viewer.setOrientation(orientationSelect.value);
    });
    const orientation = row('Orientation', orientationSelect);

    const validCheck = h('div', { style: {
      display: 'none',
      color: '#e2b200',
    } }, 'Too Small');
    const inProgress = btn({ style: {
      display: 'none',
    } }, 'Updating...');
    const forceRefresh = btn({ onclick: () => {
      inProgress.style.display = 'block';
      forceRefresh.style.display = 'none';
      setTimeout(() => {
        this.binder.makeBook(() => {
          inProgress.style.display = 'none';
          forceRefresh.style.display = 'block';
        }, 10);
      });
    } }, 'Rebuild Layout');

    const viewModes = [
      viewMode('grid', viewer.setGrid, 'Preview'),
      viewMode('outline', viewer.setOutline, 'Outline'),
      viewMode('flip', viewer.setFlip, 'Flip'),
      viewMode('print', viewer.setPrint, 'Sheet'),
    ];

    const viewSwitcher = h(c('.viewswitcher'), ...viewModes);

    const header = title('Loading...');

    const updateLayoutPreview = (newSize, newMargin) => {
      const px = {
        top: convertStrToPx(newMargin.top),
        inner: convertStrToPx(newMargin.inner),
        outer: convertStrToPx(newMargin.outer),
        bottom: convertStrToPx(newMargin.bottom),
        width: convertStrToPx(newSize.width),
        height: convertStrToPx(newSize.height),
      };

      const BASE = 90;
      let ratio = px.width / px.height;
      ratio = Math.max(ratio, 0.6);
      ratio = Math.min(ratio, 1.8);

      let width;
      let height;
      if (ratio > 2) {
        width = BASE * ratio;
        height = BASE;
      } else {
        width = BASE;
        height = (BASE * 1) / ratio;
      }

      const t = (px.top / px.height) * height;
      const b = (px.bottom / px.height) * height;
      const o = (px.outer / px.width) * width;
      const i = (px.inner / px.width) * width;

      sizeControl.style.width = `${width}px`;
      sizeControl.style.height = `${height}px`;
      marginControl.style.width = `${width}px`;
      marginControl.style.height = `${height}px`;

      marginPreview.style.top = `${t}px`;
      marginPreview.style.bottom = `${b}px`;
      marginPreview.style.left = `${i}px`;
      marginPreview.style.right = `${o}px`;
    };
    updateLayoutPreview(this.binder.pageSize, this.binder.pageMargin);

    this.setInProgress = () => {
      header.innerText = 'Paginating...';
      validCheck.style.display = 'none';
      inProgress.style.display = 'block';
      forceRefresh.style.display = 'none';
    };

    this.updateProgress = (count) => {
      header.innerText = `${count} Pages...`;
    };

    this.setDone = () => {
      header.innerText = `${viewer.book.pages.length} Pages`;
      inProgress.style.display = 'none';
      forceRefresh.style.display = 'block';
      validCheck.style.display = 'none';
    };

    this.setInvalid = () => {
      validCheck.style.display = 'block';
      forceRefresh.style.display = 'block';
      inProgress.style.display = 'none';
    };

    const updateLayout = () => {
      const newMargin = {
        top: unitInputs.top.value,
        inner: unitInputs.inner.value,
        outer: unitInputs.outer.value,
        bottom: unitInputs.bottom.value,
      };
      const newSize = {
        height: unitInputs.height.value,
        width: unitInputs.width.value,
      };

      let needsUpdate = false;
      Object.keys(newMargin).forEach((k) => {
        if (this.binder.pageMargin[k] !== newMargin[k]) { needsUpdate = true; }
      });
      Object.keys(newSize).forEach((k) => {
        if (this.binder.pageSize[k] !== newSize[k]) { needsUpdate = true; }
      });

      if (needsUpdate) {
        updateLayoutPreview(newSize, newMargin);
        this.binder.setSize(newSize);
        this.binder.setMargin(newMargin);

        if (this.binder.isSizeValid()) {
          this.binder.makeBook();
        } else {
          this.setInvalid();
        }
      }
    };

    let updateDelay;
    const throttledUpdate = () => {
      clearTimeout(updateDelay);
      updateDelay = setTimeout(updateLayout, 700);
    };

    Object.keys(unitInputs).forEach((k) => {
      unitInputs[k].addEventListener('change', throttledUpdate);
      unitInputs[k].addEventListener('keyup', throttledUpdate);
    });

    const layoutState = h('div',
      forceRefresh,
      validCheck,
      inProgress,
    );

    let debugRow;
    const toggleDebug = () => {
      debugRow.classList.toggle('selected');
      this.binder.debug = !this.binder.debug;
    };
    debugRow = switchRow({ onclick: toggleDebug }, 'Debug');
    if (this.binder.debug) debugRow.classList.add('selected');

    this.holder = document.body.appendChild(
      h(c('.controls'),
        header,
        arrangement,
        paperSize,
        orientation,

        expandRow('Marks and Bleed'),
        expandArea(
          cropToggle,
          bleedMarkToggle,
        ),

        expandRow('Book Setup'),
        expandArea(
          layoutControl,
          debugRow,
          layoutState,
        ),

        doneBtn,
        printBtn,
        viewSwitcher,
      )
    );
  }

}

export default ControlPanel;
