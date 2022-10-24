import { useEffect, useMemo, useRef } from "react"
import {
  AmbientLight,
  Group,
  MeshLambertMaterial,
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

let i = 0

function App() {
  const rootRef = useRef<HTMLDivElement>(null)

  const renderer = useMemo(() => new WebGLRenderer(), [])

  const models = useRef<IFCModel[]>([])

  useEffect(() => {
    const go = async () => {
      if (i === 0) {
        i++
        return
      }
      if (!rootRef.current) return

      console.log("useEffect called")

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
      const ifc = ifcLoader.ifcManager
      ifc.setWasmPath("../../../wasm/")
      ifc.setupThreeMeshBVH(
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

      const ifcModel1 = await ifcLoader.loadAsync(ifcUrl)
      models.current.push(ifcModel1)
      group1.add(ifcModel1)

      const ifcModel2 = await ifcLoader.loadAsync(ifcUrl)
      models.current.push(ifcModel2)
      group2.add(ifcModel1)

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

      const preselectMat = new MeshLambertMaterial({
        transparent: true,
        opacity: 0.6,
        color: 0xff88ff,
        depthTest: false,
      })

      // Reference to the previous selection
      let preselectModel = { id: -1 }

      function highlight(event: any, material: any, model: any) {
        const found: any = cast(event)[0]
        if (found) {
          console.log(found.object.modelID)
          console.log(ifc.state.models)

          // Gets model ID
          model.id = found.object.modelID

          // if (!(found.object.modelID in ifc.state.models)) {
          //   ifc.state.models[found.object.modelID] = found.object
          // }

          // Gets Express ID
          const index = found.faceIndex
          const geometry = found.object.geometry
          const id = ifc.getExpressId(geometry, index)

          // Creates subset
          ifcLoader.ifcManager.createSubset({
            modelID: model.id,
            ids: [id],
            material: material,
            scene: scene,
            removePrevious: true,
          })
        } else {
          // Removes previous highlight
          ifc.removeSubset(model.id, material)
        }
      }

      function animate() {
        requestAnimationFrame(animate)
        renderer.render(scene, camera)
        controls.update()
      }

      renderer.domElement.onmousemove = (event) =>
        highlight(event, preselectMat, preselectModel)
      animate()
    }

    go()
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
