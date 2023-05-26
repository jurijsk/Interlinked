```
	"menu": [
		{"name": "with Hyperlinks Only", "command": "with_hyperlinks"},
		{"name": "with Hyperlinks & Interactions", "command": "with_both"}
	],

		{
			"command": "with_hyperlinks",
			"name": "with_hyperlinks",
			"multipleSelection": true
		},
		{
			"command": "with_both",
			"name": "with_both",
			"multipleSelection": true
		}
```


# Testcases
- [x] First run from CP without selection: [1] Component created, nodes create + linked
- [x] Second run from CP without selection: [2] Component reused,  nodes create + linked
- [] Run from DP without selection: [2]
- [] Run from CP after component was lifted: [#3] find the component by name, reset the ids
- [] Run from DP adter component was lifted: [#3]
- [] First run from CD with incorrect selection: notify -> on click: [#2]


