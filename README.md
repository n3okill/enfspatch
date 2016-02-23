[![Build Status](https://travis-ci.org/n3okill/enfspatch.svg)](https://travis-ci.org/n3okill/enfspatch)
[![Build status](https://ci.appveyor.com/api/projects/status/524gen7vw7csbek8/branch/master?svg=true)](https://ci.appveyor.com/project/n3okill/enfspatch/branch/master)
[![Codacy Badge](https://api.codacy.com/project/badge/grade/e75d4c3ee1da4ff5a4d48f7dadb308bb)](https://www.codacy.com/app/n3okill/enfspatch)
[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=64PYTCDH5UNZ6)

[![NPM](https://nodei.co/npm/enfspatch.png)](https://nodei.co/npm/enfspatch/)

enfspatch
=========
Additional methods and patches for node fs module

**enfs** stands for [E]asy [N]ode [fs]

This module is intended to work as a sub-module of [enfs](https://www.npmjs.com/package/enfs)

Description
-----------
This module will change some behaviors of fs module from node
such as creating a queue for opening files when limit is reached,
catching the error's and proceeding with the process when possible.
This module implements many methods through [enfsaddins](https://www.npmjs.com/package/enfsaddins)
  
Usage
-----
`enfspatch` is a drop-in replacement for native `fs` module, you just need to include
it instead of the native module.

Use this
```js
    var enfs = require("esnofspatch");
```

instead of

```js
    var fs = require("fs"); //You don't need to do this anymore
```

and all the methods from native fs module are available

Errors
------
All the methods follows the node culture.
- Async: Every async method returns an Error in the first callback parameter
- Sync: Every sync method throws an Error.


Credit
------

This module is based on [graceful-fs](https://github.com/isaacs/node-graceful-fs)
- [Isaac Shlueter](https://github.com/isaacs)


License
-------

Creative Commons Attribution 4.0 International License

Copyright (c) 2016 Joao Parreira <joaofrparreira@gmail.com> [GitHub](https://github.com/n3okill)

This work is licensed under the Creative Commons Attribution 4.0 International License. 
To view a copy of this license, visit [CCA4](http://creativecommons.org/licenses/by/4.0/).


