"""Builds the MOVEXA 3D man and woman with MPFB (MakeHuman, CC0 assets) and exports GLB files."""
import bpy, os, sys, json, glob, math, traceback
OUT=os.environ.get("OUT","/tmp/out"); os.makedirs(OUT,exist_ok=True)
log=open(os.path.join(OUT,"gen_log.txt"),"w")
def p(*a):
    print(*a); print(*a,file=log); log.flush()
bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
DATA=LocationService.get_user_data()
def asset(kind,name):
    f=glob.glob(os.path.join(DATA,kind,name,"*.mhclo"))+glob.glob(os.path.join(DATA,kind,name,"*.proxy"))
    p("asset",kind,name,f); return f[0] if f else None
SPECS={
 "male":{"gender":1.0,"age":0.5,"muscle":0.85,"weight":0.55,"height":0.6,"proportions":0.75,"proxy":"male_muscle_13290","hair":"short02","brows":"eyebrow001"},
 "female":{"gender":0.0,"age":0.5,"muscle":0.7,"weight":0.45,"height":0.5,"proportions":0.75,"cupsize":0.45,"firmness":0.6,"proxy":"female_muscle_13442","hair":"ponytail01","brows":"eyebrow010"},
}
def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")
for kind,sp in SPECS.items():
    try:
        clear()
        macro=TargetService.get_default_macro_info_dict()
        for k in ["gender","age","muscle","weight","height","proportions","cupsize","firmness"]:
            if k in sp: macro[k]=sp[k]
        macro["race"]={"african":0.33,"asian":0.33,"caucasian":0.34}
        base=HumanService.create_human(macro_detail_dict=macro)
        p(kind,"basemesh",len(base.data.vertices))
        rig=HumanService.add_builtin_rig(base,"game_engine")
        p(kind,"rig",rig.name if rig else None, len(rig.data.bones) if rig else 0)
        parts={}
        for (k,t,mt) in [(sp["proxy"],"Proxymeshes","MAKESKIN"),("low-poly","Eyes","MAKESKIN"),(sp["brows"],"Eyebrows","MAKESKIN"),(sp["hair"],"Hair","MAKESKIN")]:
            folder={"Proxymeshes":"proxymeshes","Eyes":"eyes","Eyebrows":"eyebrows","Hair":"hair"}[t]
            f=asset(folder,k)
            if not f: continue
            try:
                o=HumanService.add_mhclo_asset(f,base,asset_type=t,subdiv_levels=0,material_type=mt)
                parts[t]=o; p(kind,"added",t,o.name,len(o.data.vertices))
            except Exception as e:
                p(kind,"add fail",t,e); traceback.print_exc(file=log)
        # rest-pose skeleton info for the app (Blender Z-up world coordinates)
        bones={b.name:{"head":list(rig.matrix_world@b.head_local),"tail":list(rig.matrix_world@b.tail_local),"parent":b.parent.name if b.parent else None} for b in rig.data.bones}
        json.dump(bones,open(os.path.join(OUT,f"{kind}_bones.json"),"w"),indent=0)
        # hide basemesh when a body proxy is present
        export_objs=[rig]+[o for o in parts.values()]
        if "Proxymeshes" not in parts: export_objs.append(base)
        bpy.ops.object.select_all(action="DESELECT")
        for o in export_objs: o.select_set(True)
        bpy.context.view_layer.objects.active=rig
        for o in export_objs:
            p(kind,"export obj",o.name,o.type,[m.type for m in getattr(o,"modifiers",[])])
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,f"{kind}.glb"),export_format="GLB",use_selection=True,export_apply=True,
            export_skins=True,export_animations=False,export_morph=False,export_materials="NONE",export_yup=True)
        p(kind,"exported",os.path.getsize(os.path.join(OUT,f"{kind}.glb")))
        # quick preview render (Cycles CPU, headless-safe)
        sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=12; sc.cycles.device="CPU"
        sc.render.resolution_x=360; sc.render.resolution_y=540
        if "Proxymeshes" in parts: base.hide_render=True
        cam=bpy.data.objects.new("cam",bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera=cam
        light=bpy.data.objects.new("sun",bpy.data.lights.new("sun","SUN")); light.data.energy=3; light.rotation_euler=(0.8,0.2,0.6); sc.collection.objects.link(light)
        world=bpy.data.worlds.new("w"); sc.world=world; world.use_nodes=True; world.node_tree.nodes["Background"].inputs[0].default_value=(1,1,1,1); world.node_tree.nodes["Background"].inputs[1].default_value=0.6
        for ang,name in [(0,"front"),(90,"side")]:
            r=math.radians(ang); d=4.2
            cam.location=(d*math.sin(r)*-1, -d*math.cos(r), 0.95); cam.rotation_euler=(math.radians(90),0,-r)
            cam.data.lens=50
            sc.render.filepath=os.path.join(OUT,f"{kind}_{name}.png"); bpy.ops.render.render(write_still=True)
        p(kind,"rendered")
    except Exception as e:
        p(kind,"FAILED",e); traceback.print_exc(file=log)
log.close()
