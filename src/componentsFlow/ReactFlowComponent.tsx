import React, {
  useCallback,
  BaseSyntheticEvent,
  MouseEvent,
  useRef,
  useState,
  DragEvent,
  memo,
  useContext,
} from 'react'
import ReactFlow, {
  useReactFlow,
  Background,
  SelectionMode,
  NodeTypes,
  EdgeTypes,
  ReactFlowInstance,
  Node,
  Edge,
  EdgeMarker,
  OnConnectStartParams,
  useOnViewportChange,
  Viewport,
  useNodesState,
  useEdgesState,
  OnConnectStart,
  OnConnectEnd,
} from 'reactflow'
import isEqual from 'react-fast-compare'

import {
  CustomConnectionLine,
  CustomEdge,
  CustomEdgeData,
  customConnectionLineStyle,
  customEdgeOptions,
} from './Edge'
import { customAddNodes, CustomNode, CustomNodeData } from './Node'
import { CustomControls } from './CustomControl'
import { CustomMarkerDefs } from './CustomDefs'
import {
  hardcodedNodeSize,
  styles,
  useTokenDataTransferHandle,
} from '../constants'
import { FlowContext } from '../components/Contexts'
import { useTimeMachine } from '../utils/timeMachine'
import { roundTo } from '../utils/utils'
import { PromptSourceComponentsType } from '../utils/magicExplain'
import { EntityType } from '../utils/socket'
import { ModelForMagic, globalBestModelAvailable } from '../utils/openAI'
import { ReactFlowObjectContext } from '../components/Answer'
import { SimpleEdge } from './SimpleEdge'
import { InterchangeContext } from '../components/Interchange'
import { OriginRange } from '../App'

const reactFlowWrapperStyle = {
  width: '100%',
  height: '100%',
} as React.CSSProperties

const defaultNodes: Node[] = []
const defaultEdges: Edge[] = []

const nodeTypes = {
  custom: CustomNode,
  // magic: MagicNode,
  // group: CustomGroupNode,
} as NodeTypes

const edgeTypes = {
  custom: CustomEdge,
  simple: SimpleEdge,
} as EdgeTypes

/**
 * Controlling the diagram.
 */
const Flow = () => {
  const {
    questionAndAnswer: { answerObjects },
    handleSetSyncedCoReferenceOriginRanges,
    handleAnswerObjectNodeMerge,
  } = useContext(InterchangeContext)
  const { answerObjectId, generatingFlow } = useContext(ReactFlowObjectContext)

  const thisReactFlowInstance = useReactFlow()
  const {
    setNodes,
    setEdges,
    setViewport,
    addNodes,
    toObject,
    getViewport,
  }: ReactFlowInstance = thisReactFlowInstance

  const answerObject = answerObjects.find(a => a.id === answerObjectId)

  // use default nodes and edges
  const [nodes, , onNodesChange] = useNodesState(defaultNodes)
  const [edges, , onEdgesChange] = useEdgesState(defaultEdges)

  const defaultViewport = {
    x: (window.innerWidth * 0.5) / 2,
    y: Math.min(window.innerHeight * 0.3, 1000) / 2,
    // x: 0,
    // y: 0,
    zoom: 1,
  }

  /* -------------------------------------------------------------------------- */
  // ! internal states
  const reactFlowWrapper = useRef(null)

  const [selectedComponents] = useState({
    nodes: [],
    edges: [],
  } as PromptSourceComponentsType)

  const { undoTime, redoTime, canUndo, canRedo } = useTimeMachine(
    toObject(),
    setNodes,
    setEdges,
    setViewport,
  )

  // viewport
  const [roughZoomLevel, setRoughZoomLevel] = useState(
    roundTo(getViewport().zoom, 2),
  )
  useOnViewportChange({
    onChange: (v: Viewport) => {
      if (roughZoomLevel !== roundTo(getViewport().zoom, 2))
        setRoughZoomLevel(roundTo(getViewport().zoom, 2))
    },
  })

  const initialSelectItem = useRef<{
    selected: boolean
    type: 'node' | 'edge'
    id: string
  }>({
    selected: false,
    type: 'node',
    id: '',
  })

  /* -------------------------------------------------------------------------- */

  // ! store to session storage and push to time machine
  /*
  useEffect(() => {
    const dragging = nodes.find((nd: Node) => nd.dragging)
    if (dragging) return

    // if text editing then don't store
    const editing =
      nodes.find((nd: Node) => nd.type === 'custom' && nd.data.editing) ||
      edges.find((ed: Edge) => ed.data.editing)
    if (editing) return

    // ! store and save in time machine
    // storeItem(toObject(), setTime)

    // ! update selected
    // TODO any more efficient way to do this?
    const selectedNodes = nodes.filter((nd: Node) => nd.selected)
    const selectedEdges = edges.filter((ed: Edge) => ed.selected)
    if (
      !isEqual(selectedComponents.nodes, selectedNodes) ||
      !isEqual(selectedComponents.edges, selectedEdges)
    )
      setSelectedComponents({
        nodes: selectedNodes.map((nd: Node) => nd.id),
        edges: selectedEdges.map((ed: Edge) => ed.id),
      })
  }, [nodes, edges, toObject, setTime, selectedComponents])
  */

  // ! keys
  // const metaPressed = useKeyPress(['Ctrl', 'Alt', 'Space'])
  // * const metaPressed = useKeyPress(['Alt'])
  const metaPressed = false
  // const undoPressed = useKeyPress('Meta+z')
  // const redoPressed = useKeyPress('Meta+x')

  // useEffect(() => {
  //   if (undoPressed && canUndo) undoTime()
  // }, [undoPressed, canUndo, undoTime])

  // useEffect(() => {
  //   if (redoPressed && canRedo) redoTime()
  // }, [redoPressed, canRedo, redoTime])

  // ! on connect
  /*
  const onConnect = useCallback(
    (params: Connection) => {
      addEdges(
        // overwrite default edge configs here
        getNewEdge(params)
      )
    },
    [addEdges]
  )
  */
  const onConnect = useCallback(() => {}, [])

  /* -------------------------------------------------------------------------- */
  // ! node

  // node - set editing status
  const doSetNodesEditing = useCallback(
    (nodeIds: string[], editing: boolean) => {
      setNodes((nds: Node[]) => {
        return nds.map((nd: Node) => {
          if (!nodeIds.includes(nd.id) || nd.type !== 'custom') return nd
          else {
            return {
              ...nd,
              data: {
                ...nd.data,
                editing,
              },
            }
          }
        })
      })
    },
    [setNodes],
  )

  const selectNodes = useCallback(
    (nodeIds: string[]) => {
      setNodes((nds: Node[]) => {
        return nds.map((nd: Node) => {
          if (!nodeIds.includes(nd.id))
            return {
              ...nd,
              selected: false,
            }
          else
            return {
              ...nd,
              selected: true,
            }
        })
      })
    },
    [setNodes],
  )

  // ! node right click
  const handleNodeContextMenu = useCallback((e: BaseSyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const selectNodeAndEdges = useCallback(
    (node: Node) => {
      setNodes((nds: Node[]) => {
        return nds.map((nd: Node) => {
          if (nd.id === node.id)
            return {
              ...nd,
              selected: true,
            }
          else if (nd.id !== node.id && nd.type === 'custom')
            return {
              ...nd,
              selected: false,
            }
          else return nd
        })
      })

      setEdges((eds: Edge[]) => {
        return eds.map((ed: Edge) => {
          if (ed.source === node.id || ed.target === node.id)
            return {
              ...ed,
              selected: true,
            }
          else return ed
        })
      })
    },
    [setEdges, setNodes],
  )

  const handleNodeClick = useCallback(
    (e: BaseSyntheticEvent, node: Node) => {
      // select the node and all its edges
      selectNodeAndEdges(node)
      initialSelectItem.current = {
        selected: true,
        type: 'node',
        id: node.id,
      }
    },
    [selectNodeAndEdges],
  )

  const handleNodeDoubleClick = useCallback(
    (e: BaseSyntheticEvent, node: Node) => {
      // e.preventDefault()
      // e.stopPropagation()
      // if (node.type === 'custom') doSetNodesEditing([node.id], true)
      initialSelectItem.current = {
        selected: true,
        type: 'node',
        id: node.id,
      }
    },
    [],
  )

  const handleNodeDragStart = useCallback(
    (e: MouseEvent, node: Node) => {
      // anyNodeDragging.current = true
      selectNodeAndEdges(node)
      initialSelectItem.current = {
        selected: true,
        type: 'node',
        id: node.id,
      }
    },
    [selectNodeAndEdges],
  )

  const _centerIntersectingNodes = useCallback(
    (node: Node, movementX = 0, movementY = 0) => {
      const {
        position: { x: nodeXCurrent, y: nodeYCurrent },
        width: nodeWidthCurrent,
        height: nodeHeightCurrent,
      } = node

      const nodeXCurrentCenter =
        nodeXCurrent + (nodeWidthCurrent ?? 0) / 2 + movementX
      const nodeYCurrentCenter =
        nodeYCurrent + (nodeHeightCurrent ?? 0) / 2 + movementY

      const intersections = nodes
        .filter((nd: Node) => {
          if (nd.id === node.id) return false

          const {
            position: { x: nodeX, y: nodeY },
            width: nodeWidth,
            height: nodeHeight,
          } = nd

          return (
            nodeXCurrentCenter >= nodeX &&
            nodeXCurrentCenter <= nodeX + (nodeWidth ?? 0) &&
            nodeYCurrentCenter >= nodeY &&
            nodeYCurrentCenter <= nodeY + (nodeHeight ?? 0)
          )
        })
        .map(nd => nd.id)

      return intersections
    },
    [nodes],
  )

  const handleNodeDrag = useCallback(
    (e: MouseEvent, node: Node) => {
      if (
        generatingFlow ||
        !answerObject ||
        answerObject.answerObjectSynced.listDisplay === 'summary'
      )
        return

      // get all the nodes that the center of the current node is in
      // const intersections = getIntersectingNodes(node).map(nd => nd.id)
      const intersections = _centerIntersectingNodes(
        node,
        e.movementX,
        e.movementY,
      )

      const setPosition = generatingFlow
        ? {}
        : {
            position: {
              x: node.position.x + e.movementX,
              y: node.position.y + e.movementY,
            },
          }

      setNodes(ns =>
        ns.map((n: Node): Node<CustomNodeData> => {
          if (n.id === node.id)
            return {
              ...n,
              ...setPosition,
              // position: {
              //   x: node.position.x + (generatingFlow ? 0 : e.movementX),
              //   y: node.position.y + (generatingFlow ? 0 : e.movementY),
              // },
              className:
                intersections.length && !generatingFlow
                  ? 'node-to-merge-source'
                  : '',
            }

          return {
            ...n,
            className: intersections.includes(n.id)
              ? 'node-to-merge-target'
              : '',
          }
        }),
      )
    },
    [_centerIntersectingNodes, answerObject, generatingFlow, setNodes],
  )

  const handleNodeDragStop = useCallback(
    (e: MouseEvent, node: Node) => {
      if (
        generatingFlow ||
        !answerObject ||
        answerObject.answerObjectSynced.listDisplay === 'summary'
      )
        return

      // const intersections = getIntersectingNodes(node).map(nd => nd.id)
      const intersections = _centerIntersectingNodes(node)

      // merge node with the first intersecting node
      if (intersections.length) {
        const targetNodeId = intersections[0]

        // merge the nodes
        handleAnswerObjectNodeMerge(answerObjectId, node.id, targetNodeId)
      }
    },
    [
      _centerIntersectingNodes,
      answerObject,
      answerObjectId,
      generatingFlow,
      handleAnswerObjectNodeMerge,
    ],
  )

  /* -------------------------------------------------------------------------- */

  // ! drag and drop from tokens

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()

      const token = JSON.parse(
        e.dataTransfer.getData(`application/${useTokenDataTransferHandle}`),
      ) as EntityType

      // check if the dropped element is valid
      if (typeof token === 'undefined' || !token || !token.value) {
        return
      }

      const position = thisReactFlowInstance.project({
        x: e.clientX,
        y: e.clientY,
      })

      // add by drop tokens
      customAddNodes(
        addNodes,
        selectNodes,
        position.x - hardcodedNodeSize.width / 2,
        position.y - hardcodedNodeSize.height / 2,
        {
          label: `${token.value}`,
          select: false,
          editing: false,
          styleBackground: styles.nodeColorDefaultWhite,
          toFitView: false,
          fitView: undefined,
        },
      )
    },
    [addNodes, selectNodes, thisReactFlowInstance],
  )

  /* -------------------------------------------------------------------------- */
  // ! edge

  // build new nodes on drag out
  /*
  const onConnectStart = useCallback(
    (_: MouseEvent, { nodeId, handleId }: OnConnectStartParams) => {
      currentConnectingNode.current.id = nodeId || ''
      currentConnectingNode.current.sourceHandleId = handleId || ''
    },
    []
  )
  */
  const onConnectStart = useCallback(
    (_: MouseEvent, { nodeId, handleId }: OnConnectStartParams) => {},
    [],
  )

  /*
  const onConnectEnd = useCallback(
    (event: any) => {
      const targetIsPane = (event.target as HTMLElement).classList.contains(
        'react-flow__pane'
      )

      // ! drop to an empty space
      if (targetIsPane && reactFlowWrapper.current) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const { top, left } = (
          reactFlowWrapper.current as HTMLElement
        ).getBoundingClientRect()
        const { x, y, zoom } = getViewport()
        const { width: nodeWidth, height: nodeHeight } = hardcodedNodeSize

        // add by drop edge
        const { nodeId, targetHandleId } = customAddNodes(
          addNodes,
          selectNodes,
          event.clientX / zoom - left - x / zoom - nodeWidth / 2,
          event.clientY / zoom - top - y / zoom - nodeHeight / 2,
          {
            label: '',
            select: true,
            editing: false,
            styleBackground: styles.nodeColorDefaultWhite,
            toFitView: false,
            fitView: fitView,
          }
        )
        setEdges(eds =>
          eds.concat(
            getNewEdge({
              source: currentConnectingNode.current.id,
              sourceHandle: currentConnectingNode.current.sourceHandleId,
              target: nodeId,
              targetHandle: targetHandleId,
            })
          )
        )

        // setTimeout(() => {
        //   doSetNodeEditing([nodeId], true)
        // }, 50)
      }
    },
    [getViewport, addNodes, selectNodes, fitView, setEdges]
  )
  */
  const onConnectEnd = useCallback((event: any) => {}, [])

  const doSetEdgesEditing = useCallback(
    (edgeIds: string[], editing: boolean) => {
      setEdges((eds: Edge[]) => {
        return eds.map((ed: Edge) => {
          if (!edgeIds.includes(ed.id)) return ed
          else {
            return {
              ...ed,
              data: {
                ...ed.data,
                editing,
              },
            }
          }
        })
      })
    },
    [setEdges],
  )

  const handleEdgeClick = useCallback((e: MouseEvent, edge: Edge) => {
    initialSelectItem.current = {
      selected: true,
      type: 'edge',
      id: edge.id,
    }
  }, [])

  const handleEdgeDoubleClick = useCallback(
    (e: BaseSyntheticEvent, edge: Edge) => {
      // e.preventDefault()
      // e.stopPropagation()
      // setEdges((nds: Edge[]) => {
      //   return nds.map((nd: Edge) => {
      //     if (edge.id !== nd.id) return nd
      //     else {
      //       return {
      //         ...nd,
      //         data: {
      //           ...nd.data,
      //           editing: true,
      //         },
      //       }
      //     }
      //   })
      // })
      initialSelectItem.current = {
        selected: true,
        type: 'edge',
        id: edge.id,
      }
    },
    [],
  )

  /* -------------------------------------------------------------------------- */
  // ! pane

  // const lastClickTime = useRef<number | null>(null)
  const handlePaneClick = useCallback(
    (e: MouseEvent) => {
      // if any node is editing
      if (nodes.some(nd => nd.data?.editing))
        setNodes((nds: Node[]) => {
          return nds.map((nd: Node) => {
            if (!nd.data.editing || nd.type !== 'custom') return nd
            return {
              ...nd,
              data: {
                ...nd.data,
                editing: false,
              } as CustomNodeData,
            } as Node
          })
        })

      handleSetSyncedCoReferenceOriginRanges([] as OriginRange[])

      initialSelectItem.current = {
        selected: false,
        type: 'node',
        id: '',
      }
    },
    [handleSetSyncedCoReferenceOriginRanges, nodes, setNodes],
  )

  /* -------------------------------------------------------------------------- */
  // ! chat

  const handleNodeMouseEnter = useCallback(
    (e: MouseEvent, node: Node) => {
      const { data } = node
      const {
        generated: { originRanges },
      } = data as CustomNodeData
      handleSetSyncedCoReferenceOriginRanges(originRanges)
    },
    [handleSetSyncedCoReferenceOriginRanges],
  )

  const handleNodeMouseLeave = useCallback(
    (e: MouseEvent, node: Node) => {
      handleSetSyncedCoReferenceOriginRanges(
        nodes
          .filter((nd: Node) => nd.selected)
          .map(selectedNode => {
            const node = nodes.find((nd: Node) => nd.id === selectedNode.id)
            if (!node) return null

            const { data } = node
            const {
              generated: { originRanges },
            } = data as CustomNodeData

            return originRanges
          })
          .filter(
            (
              originRanges: OriginRange[] | null,
            ): originRanges is OriginRange[] => originRanges !== null,
          )
          .flat(1) as OriginRange[],
      )
    },
    [handleSetSyncedCoReferenceOriginRanges, nodes],
  )

  const handleEdgeMouseEnter = useCallback(
    (e: MouseEvent, edge: Edge<CustomEdgeData>) => {
      if (edge.data?.generated?.originRanges)
        handleSetSyncedCoReferenceOriginRanges(
          edge?.data.generated?.originRanges,
        )
    },
    [handleSetSyncedCoReferenceOriginRanges],
  )

  const handleEdgeMouseLeave = useCallback(
    (e: MouseEvent, edge: Edge<CustomEdgeData>) => {
      handleSetSyncedCoReferenceOriginRanges(
        edges
          .filter((ed: Edge) => ed.selected)
          .map(selectedEdge => {
            const edge = edges.find(ed => ed.id === selectedEdge.id)
            if (!edge) return null

            return edge.data?.generated?.originRanges ?? null
          })
          .filter(
            (
              originRanges: OriginRange[] | null,
            ): originRanges is OriginRange[] => !!originRanges,
          )
          .flat(1) as OriginRange[],
      )
    },
    [edges, handleSetSyncedCoReferenceOriginRanges],
  )

  const [modelForMagic, setModelForMagic] = useState<ModelForMagic>(
    globalBestModelAvailable,
  )

  const handleScroll = useCallback((e: any) => {}, [])

  return (
    <FlowContext.Provider
      value={{
        metaPressed,
        model: modelForMagic,
        selectedComponents: selectedComponents,
        initialSelectItem: initialSelectItem.current,
        doSetNodesEditing,
        doSetEdgesEditing,
        selectNodes,
        setModel: setModelForMagic,
      }}
    >
      <div
        className={`react-flow-wrapper${
          generatingFlow ? ' generating-flow' : ''
        }`}
        ref={reactFlowWrapper}
      >
        <ReactFlow
          className={`${metaPressed ? 'flow-meta-pressed' : ''}`}
          // basic
          defaultViewport={defaultViewport}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart as OnConnectStart}
          onConnectEnd={onConnectEnd as OnConnectEnd}
          // flow view
          style={reactFlowWrapperStyle}
          fitView={false}
          attributionPosition="bottom-right"
          maxZoom={1}
          // edge specs
          elevateEdgesOnSelect={false}
          defaultEdgeOptions={customEdgeOptions} // adding a new edge with this configs without notice
          connectionLineComponent={CustomConnectionLine}
          connectionLineStyle={customConnectionLineStyle}
          // viewport control
          panOnScroll={false}
          zoomOnScroll={false}
          preventScrolling={false}
          selectionOnDrag={false}
          panOnDrag={[0, 1, 2]}
          selectionMode={SelectionMode.Full}
          selectNodesOnDrag={false}
          // ! actions
          onScroll={handleScroll}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onEdgeClick={handleEdgeClick}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onPaneClick={handlePaneClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          // onPaneContextMenu={handlePaneContextMenu}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onEdgeMouseEnter={handleEdgeMouseEnter}
          onEdgeMouseLeave={handleEdgeMouseLeave}
        >
          <CustomMarkerDefs
            markerOptions={
              {
                color: styles.edgeColorStrokeSelected,
              } as EdgeMarker
            }
          />
          <CustomMarkerDefs
            markerOptions={
              {
                color: styles.edgeColorStrokeExplained,
              } as EdgeMarker
            }
          />
          <CustomControls
            nodes={nodes}
            edges={edges}
            selectedComponents={selectedComponents}
            undoTime={undoTime}
            redoTime={redoTime}
            canUndo={canUndo}
            canRedo={canRedo}
            flowWrapperRef={reactFlowWrapper}
          />
          <Background color="#008ddf" />
        </ReactFlow>
      </div>
    </FlowContext.Provider>
  )
}

const ReactFlowComponent = memo(({ id }: { id: string }) => {
  return <Flow key={`flow-${id}`} />
}, isEqual)

export default ReactFlowComponent
