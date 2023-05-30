# Interlinked


Figma plugin that links two nodes for better navigation while in Desing Mode. Or in Presentation mode.


Interlined makes it easy to navigate in Design Mode within Figma file, even across pages.


When you run Interlinked for the first time, it will create ‘interlink’ component for you.


**Restyle your links.** You can change the component whatever you like, but it must have ‘interlink’ text node to work.


**Use your components.** You can also use Interlinked with your components of choice, as long as they have a text node named 'interlink'. Select 2 instances and run Interlined from the Command Pallete (Cmd+/)



**Works with interactions.** You can enable Presentation mode interactions from the Design Panel and the page level. It’s off by default because it can lead to a messy workspace, and Figma creates a starting point, which you probably don't need.




## Versions

v2

Fixed handling of connecting using single node. When you copy a single node from an existing connection and interlink, a new node will be created. Previously, it would break the existing link between the copied node and its counterpart. 

