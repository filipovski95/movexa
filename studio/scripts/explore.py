import bpy, sys, os, importlib, inspect, pkgutil, traceback
log=open(os.environ.get("LOG","/tmp/explore.txt"),"w")
def p(*a):
    print(*a); print(*a,file=log); log.flush()
try:
    bpy.ops.preferences.addon_enable(module="bl_ext.user_default.mpfb")
    p("enabled mpfb")
except Exception as e:
    p("enable failed", e); traceback.print_exc(file=log)
import addon_utils
p([m.__name__ for m in addon_utils.modules() if "mpfb" in m.__name__])
try:
    from bl_ext.user_default.mpfb.services.locationservice import LocationService
    for n in dir(LocationService):
        if n.startswith("get_"):
            try: p(n, getattr(LocationService,n)())
            except Exception as e: p(n,"ERR",e)
except Exception as e:
    p("loc err",e); traceback.print_exc(file=log)
try:
    import bl_ext.user_default.mpfb.services as S
    for mi in pkgutil.iter_modules(S.__path__):
        p("MODULE", mi.name)
    from bl_ext.user_default.mpfb.services.humanservice import HumanService
    for n,f in inspect.getmembers(HumanService, predicate=inspect.isfunction):
        p("HumanService."+n, inspect.signature(f))
    from bl_ext.user_default.mpfb.services.targetservice import TargetService
    for n,f in inspect.getmembers(TargetService, predicate=inspect.isfunction):
        p("TargetService."+n, inspect.signature(f))
except Exception as e:
    p("svc err",e); traceback.print_exc(file=log)
try:
    from bl_ext.user_default.mpfb.services.humanservice import HumanService
    b=HumanService.create_human()
    p("created", b, b.name if b else None, len(b.data.vertices) if b else 0)
except Exception as e:
    p("create err",e); traceback.print_exc(file=log)
log.close()
