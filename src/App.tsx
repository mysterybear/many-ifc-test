import { useEffect, useMemo, useRef } from "react"
import {
  AmbientLight,
  Group,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three"
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from "three-mesh-bvh"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { IFCModel } from "web-ifc-three/IFC/components/IFCModel"
import { IFCLoader } from "web-ifc-three/IFCLoader"

const ifcUrl = "room.blend.ifc"

function App() {
  const rootRef = useRef<HTMLDivElement>(null)

  const renderer = useMemo(() => new WebGLRenderer(), [])

  const models = useRef<IFCModel[]>([])

  useEffect(() => {
    if (!rootRef.current) return

    const scene = new Scene()
    const camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    const light = new AmbientLight()

    scene.add(light)

    const controls = new OrbitControls(camera, renderer.domElement)

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor("white")

    rootRef.current.appendChild(renderer.domElement)

    camera.position.z = 5

    const ifcLoader = new IFCLoader()
    ifcLoader.ifcManager.setWasmPath("../../../wasm/")
    ifcLoader.ifcManager.setupThreeMeshBVH(
      computeBoundsTree,
      disposeBoundsTree,
      acceleratedRaycast
    )

    const group1 = new Group()
    group1.position.x = -5
    scene.add(group1)

    const group2 = new Group()
    group2.position.x = 5
    scene.add(group2)

    ifcLoader.load(ifcUrl, (ifcModel) => {
      models.current.push(ifcModel)
      group1.add(ifcModel)
      const clone = ifcModel.clone()
      models.current.push(clone)
      group2.add(clone)
    })

    const raycaster = new Raycaster()
    raycaster.firstHitOnly = true
    const mouse = new Vector2()

    function cast(event: any) {
      // Computes the position of the mouse on the screen
      const bounds = renderer.domElement.getBoundingClientRect()

      const x1 = event.clientX - bounds.left
      const x2 = bounds.right - bounds.left
      mouse.x = (x1 / x2) * 2 - 1

      const y1 = event.clientY - bounds.top
      const y2 = bounds.bottom - bounds.top
      mouse.y = -(y1 / y2) * 2 + 1

      // Places it on the camera pointing to the mouse
      raycaster.setFromCamera(mouse, camera)

      // Casts a ray
      return raycaster.intersectObjects(models.current)
    }
    function pick(event: any) {
      const found: any = cast(event)[0]
      if (found) {
        const index = found.faceIndex
        const geometry = found.object.geometry
        const ifc = ifcLoader.ifcManager
        const expressId = ifc.getExpressId(geometry, index)
        console.log([found.object.modelID, expressId])
      }
    }
    function animate() {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
      controls.update()
    }

    renderer.domElement.onclick = pick

    animate()
  }, [renderer])

  return (
    <div
      ref={rootRef}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        border: "1px solid black",
      }}
    />
  )
}

export default App
