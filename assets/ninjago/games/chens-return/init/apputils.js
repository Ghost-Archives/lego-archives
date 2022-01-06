const AppUtils = {};


AppUtils.getNavigator = function()
{
    var a = navigator.userAgent || navigator.vendor || window.opera;
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))
	return true;
    
    return false;
}

AppUtils.createElement = function( type, id, className )
{
    var display = document.createElement( type );
    display.id = id;
    display.style.position = "absolute";
    display.style.left = "0px";
    display.style.top = "0px";
    display.style.transformOrigin = "0px 0px";
    
    if ( className ) display.className = className;
    
    return display;
}

AppUtils.setProps = function( item, props )
{
    var keys = Object.keys( props );
    
    for ( var i in keys )
    {
        item.style[ keys[i] ] = props[ keys[i] ];
    }
}

AppUtils.getProgramInfo = function(gl, program) 
{
    var result = {
        attributes: [],
        uniforms: [],
        attributeCount: 0,
        uniformCount: 0
    },
        activeUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS),
        activeAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

    // Taken from the WebGl spec:
    // http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.14
    var enums = {
        0x8B50: 'FLOAT_VEC2',
        0x8B51: 'FLOAT_VEC3',
        0x8B52: 'FLOAT_VEC4',
        0x8B53: 'INT_VEC2',
        0x8B54: 'INT_VEC3',
        0x8B55: 'INT_VEC4',
        0x8B56: 'BOOL',
        0x8B57: 'BOOL_VEC2',
        0x8B58: 'BOOL_VEC3',
        0x8B59: 'BOOL_VEC4',
        0x8B5A: 'FLOAT_MAT2',
        0x8B5B: 'FLOAT_MAT3',
        0x8B5C: 'FLOAT_MAT4',
        0x8B5E: 'SAMPLER_2D',
        0x8B60: 'SAMPLER_CUBE',
        0x1400: 'BYTE',
        0x1401: 'UNSIGNED_BYTE',
        0x1402: 'SHORT',
        0x1403: 'UNSIGNED_SHORT',
        0x1404: 'INT',
        0x1405: 'UNSIGNED_INT',
        0x1406: 'FLOAT'
    };

    // Loop through active uniforms
    for (var i=0; i < activeUniforms; i++) {
        var uniform = gl.getActiveUniform(program, i);
        uniform.typeName = enums[uniform.type];
        result.uniforms.push(uniform);
        result.uniformCount += uniform.size;
    }

    // Loop through active attributes
    for (var i=0; i < activeAttributes; i++) {
        var attribute = gl.getActiveAttrib(program, i);
        attribute.typeName = enums[attribute.type];
        result.attributes.push(attribute);
        result.attributeCount += attribute.size;
    }

    return result;
}

/**
* HelperMethod for getting all scene nodes with corresponding name or type
* @memberof AppUtils#
* @param {array} Array - The scene to crawl
* @param {name} String - Name filter
* @param {type} String - Type filter
*/
AppUtils.getAllObjects = function( array, name, type, recursive = true )
{
    let objects = [];
    let i = 0;
    if ( !Array.isArray( array ) ) array = [ array ];
    if ( !name ) name = "";
    if ( !type ) type = "";
    
    for( i = 0; i < array.length; i++ )
    {        
        if ( array[i].name.indexOf( name ) > -1 || name === "" )
        {            
            if ( array[i].type === type || type === "" )
            {
                objects.push( array[i] );
            }
        }

        if ( recursive )
        {
            if ( array[i].children )
            {
                objects = objects.concat( AppUtils.getAllObjects( array[i].children, name, type, recursive ) );
            }
        }
    }
    
    return objects;
}

AppUtils.getObjectsByNameAndType = function( array, name, type, recursive = true )
{
    let objects = [];
    let i = 0;
    if ( !Array.isArray( array ) ) array = [ array ];
    if ( !name ) name = "";
    if ( !type ) type = "";
    
    for( i = 0; i < array.length; i++ )
    {        
        if ( array[i].name === name || name === "" )
        {            
            if ( array[i].type === type || type === "" )
            {
                objects.push( array[i] );
            }
        }

        if ( recursive )
        {
            if ( array[i].children )
            {
                objects = objects.concat( AppUtils.getObjectByNameAndType( array[i].children, name, type, recursive ) );
            }
        }
    }
    
    return objects;
}

/*
AppUtils.findMeshInScene = function( scene, name )
{
    let mesh = null;
    let i = 0;
    let child = null;
    
    if ( !scene.children ) return;
    
    for( i = 0; i < scene.children.length; i++ )
    {
        //console.log( scene.children[i].type )
        
        if ( scene.children[i].name.indexOf( name ) > -1 && scene.children[i].type.indexOf( "mesh" ) > -1 )
        {
            mesh = scene.children[i];
        }
        else
        {
            if ( scene.children[i].children )
            {
                mesh = findMeshInScene( scene.children[i], name );
            }
        }
        
        if ( mesh ) break;
    }
    
    return mesh;
}

AppUtils.collectMeshes = function( scene )
{
    let meshes = [];
    let i = 0;
    
    for( i = 0; i < scene.children.length; i++ )
    {
        //console.log( scene.children[i].type )
        
        if ( scene.children[i].material )
        {
            meshes.push( scene.children[i] );
        }
        else
        {
            if ( scene.children[i].children )
            {
                meshes = meshes.concat( AppUtils.collectMeshes( scene.children[i] ) );
            }
        }
    }
    
    return meshes;
}
*/

AppUtils.getAllElementsWithProperty = function( array, property, value )
{    
    var elements = [];
    if ( value )
    {
        if ( value instanceof Array === false )
        {
            value = [ value ];
        }
    }

    for ( let i = 0; i < array.length; i++ )
    {
        if ( array[i].hasOwnProperty( property ) )
        {            
            if ( value )
            {
                for ( let v = 0; v < value.length; v++ )
                {
                    if ( array[i][ property ] === value[v] )
                    {
                        elements.push( array[i] );
                    }
                }
            }
            else
            {
                elements.push( array[i] );
            }
        }
    }
    
    return elements;
}

AppUtils.getSceneRoot = function( display )
{
    let root = display;
    
    if ( root.parent )
    {
        if ( root.parent.type !== "scene" )
        {
            root = AppUtils.getSceneRoot( root.parent );
        }
    }
    
    return root;
}


// <editor-fold defaultstate="collapsed">
AppUtils.calculateTangents = function( name, geometry )
{
    // get interleaved buffer data

    let vertBuffer = geometry.attributes.a_Position;
    let uvOffset = geometry.attributes.a_Uv.offset; //if ( geometry.attributes.a_Position.data )
    
    // create local buffers for convenience
    
    let verts = [];
    let uvs = [];

    for ( i = 0; i < vertBuffer.data.count * vertBuffer.data.stride; i += vertBuffer.data.stride )
    {
        verts.push( new zen3d.Vector3( vertBuffer.data.array[ i + vertBuffer.offset + 0 ], vertBuffer.data.array[ i + vertBuffer.offset + 1 ], vertBuffer.data.array[ i + vertBuffer.offset + 2 ] ));
        uvs.push( new zen3d.Vector2( vertBuffer.data.array[ i + uvOffset + 0 ], vertBuffer.data.array[ i + uvOffset + 1 ] ) );
    }
    
    let v0, v1, v2, uv0, uv1, uv2, deltaPos1, deltaPos2, deltaUV1, deltaUV2, r, tangent, tangents = [];
    let len = verts.length - verts.length%3;
    
    for ( i = 0; i < len; i += 3 )
    {
        v0 = verts[i+0];
        v1 = verts[i+1];
        v2 = verts[i+2];

        uv0 = uvs[i+0];
        uv1 = uvs[i+1];
        uv2 = uvs[i+2];

        deltaPos1 = v1.sub( v0 );
        deltaPos2 = v2.sub( v0 );

        deltaUV1 = uv1.sub( uv0 );
        deltaUV2 = uv2.sub( uv0 );

        r = 1.0 / ( deltaUV1.x * deltaUV2.y - deltaUV1.y * deltaUV2.x );
        tangent = deltaPos1.multiplyScalar( deltaUV2.y ).sub( deltaPos2.multiplyScalar( deltaUV1.y ) ).multiplyScalar( r ); //p1 * uv2.y - p2 * uv1.y

        tangents.push(tangent.x);
        tangents.push(tangent.y);
        tangents.push(tangent.z);
        tangents.push(1);

        tangents.push(tangent.x);
        tangents.push(tangent.y);
        tangents.push(tangent.z);
        tangents.push(1);

        tangents.push(tangent.x);
        tangents.push(tangent.y);
        tangents.push(tangent.z);
        tangents.push(1);
    }
    
    // add to interleaved buffer
    
    let old = 0;
    let t = 0;
    let strideCount = 0;
    let oldStride = vertBuffer.data.stride;
    let stride = vertBuffer.data.stride + 4;    
    let mergedBuffer = new Float32Array( vertBuffer.data.array.length + tangents.length );

    for ( i = 0; i < mergedBuffer.length; i += stride )
    {
        for ( strideCount = 0; strideCount < oldStride; strideCount++ )
        {
            mergedBuffer[ i + strideCount ] = vertBuffer.data.array[ old + strideCount ];
        }
        
        mergedBuffer[ i + strideCount + 0 ] = tangents[ t + 0 ];
        mergedBuffer[ i + strideCount + 1 ] = tangents[ t + 1 ];
        mergedBuffer[ i + strideCount + 2 ] = tangents[ t + 2 ];
        mergedBuffer[ i + strideCount + 3 ] = tangents[ t + 3 ];
        
        old += vertBuffer.data.stride;
        t += 4;
    }
    
    for ( let a in geometry.attributes )
    {
        console.log( a, geometry.attributes[a] )
        
        geometry.attributes[a].data.stride = stride;
        geometry.attributes[a].data.array = mergedBuffer;
    }

    geometry.addAttribute( "a_Tangent", new zen3d.InterleavedBufferAttribute( new zen3d.InterleavedBuffer( mergedBuffer, stride ), 4, oldStride ) );
}
//</editor-fold>




AppUtils.lerpVectors = function( v1, v2, ratio )
{
    let x = v1.x + ( v2.x - v1.x ) * ratio;
    let y = v1.y + ( v2.y - v1.y ) * ratio;
    let z = v1.z + ( v2.z - v1.z ) * ratio;
    
    return new zen3d.Vector3( x, y, z );
}

AppUtils.lerpQuaternions = function( q1, q2, ratio )
{
    let w1 = q1._w, x1 = q1._x, y1 = q1._y, z1 = q1._z;
    let w2 = q2._w, x2 = q2._x, y2 = q2._y, z2 = q2._z;
    let dot = w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2;
    
    let result = new zen3d.Quaternion();
    
    result._w = w1 + ratio * (w2 - w1);
    result._x = x1 + ratio * (x2 - x1);
    result._y = y1 + ratio * (y2 - y1);
    result._z = z1 + ratio * (z2 - z1);
    
    let len = 1.0 / Math.sqrt(result._w * result._w + result._x * result._x + result._y * result._y + result._z * result._z);
    result._w *= len;
    result._x *= len;
    result._y *= len;
    result._z *= len;

    return result;
}

AppUtils.getPositionFromMatrix = function( matrix )
{
    return new zen3d.Vector3( matrix.elements[12], matrix.elements[13], matrix.elements[14] );
}

AppUtils.getScaleFromMatrix = function( matrix )
{
    let v1 = new zen3d.Vector3( matrix.elements[0], matrix.elements[1], matrix.elements[2] ).getLength();
    let v2 = new zen3d.Vector3( matrix.elements[4], matrix.elements[5], matrix.elements[6] ).getLength();
    let v3 = new zen3d.Vector3( matrix.elements[8], matrix.elements[9], matrix.elements[10] ).getLength();
    
    return new zen3d.Vector3( v1, v2, v3 );
}

// convert vectors & quaternions from CANNON to zen3d and vice versa

AppUtils.convertPosition = function( v1, v2 )
{
    v2.x = v1.x;
    v2.y = v1.y;
    v2.z = v1.z;
}

AppUtils.convertQuaternion = function( q1, q2 )
{
    q2.x = q1.x;
    q2.y = q1.y;
    q2.z = q1.z;
    q2.w = q1.w;
}




AppUtils.convertHalfExtentsToScale = function( halfExtents, scale )
{
    scale.x = halfExtents.x * 2;
    scale.y = halfExtents.y * 2;
    scale.z = halfExtents.z * 2;
}

AppUtils.multiplyVectors = function( v1, v2 )
{
    v1.x *= v2.x;
    v1.y *= v2.y;
    v1.z *= v2.z;
}

/**
* Convenience Method for getting the world position
* @memberof AppUtils#
* @param {zen3d.Mesh} object - The mesh to get the position from
*/
AppUtils.getWorldPosition = function( mesh )
{
    let worldPos = new zen3d.Vector3();
    
    worldPos.x = mesh.worldMatrix.elements[12];
    worldPos.y = mesh.worldMatrix.elements[13];
    worldPos.z = mesh.worldMatrix.elements[14];
    
    return worldPos;
}

AppUtils.changeLocalMatrix = function( mesh, newParent )
{
    console.log( newParent )
    
    let inverse = newParent.worldMatrix.inverse();
    mesh.worldMatrix.multiply( inverse );
}

/**
* Convenience Method for copying the world position
* @memberof AppUtils#
* @param {zen3d.Mesh} object - Source mesh
* @param {zen3d.Mesh} object - Target mesh
*/
AppUtils.copyWorldPosition = function( sourceMesh, targetMesh )
{
    targetMesh.position.x = sourceMesh.worldMatrix.elements[12];
    targetMesh.position.y = sourceMesh.worldMatrix.elements[13];
    targetMesh.position.z = sourceMesh.worldMatrix.elements[14];
}

/**
* Convenience Method for getting the world quaternion
* @memberof AppUtils#
* @param {zen3d.Mesh} object - The mesh to get the quaternion from
*/
AppUtils.getWorldQuaternion = function( mesh )
{
    let worldQuat = new zen3d.Quaternion();
    worldQuat.setFromRotationMatrix( mesh.worldMatrix );
    
    return worldQuat;
}

/**
* Convenience Method for copying the world quaternion
* @memberof AppUtils#
* @param {zen3d.Mesh} object - The mesh to get the quaternion from
* @param {zen3d.Quaternion} object - Target quaternion
*/
AppUtils.copyWorldQuaternion = function( sourceMesh, targetMesh )
{
    let worldQuat = new zen3d.Quaternion();
    worldQuat.setFromRotationMatrix( sourceMesh.worldMatrix );
    targetMesh.quaternion.x = worldQuat.x;
    targetMesh.quaternion.y = worldQuat.y;
    targetMesh.quaternion.z = worldQuat.z;
    targetMesh.quaternion.w = worldQuat.w;
}



AppUtils.setColorsFromUV2 = function( obj, coord )
{
    let len = obj.geometry.attributes.a_Uv.data.count * obj.geometry.attributes.a_Uv.size;
    let uvs = [];
    
    for ( let i = 0; i < len; i+=2 )
    {
        uvs.push( coord.x );
        uvs.push( coord.y );
    }
    
    obj.geometry.addAttribute( "a_Uv2", new zen3d.BufferAttribute( new Float32Array( uvs ), 2 ) );
    obj.material.defines.USE_UV2 = "";
}

AppUtils.setVertexColors = function( obj, color )
{
    let rgb2float = 1 / 255;
    let count = obj.geometry.getAttribute( "a_Position" ).count;
    let colors = [];
    
    for ( let i = 0; i < count; i++ )
    {
        colors.push( color.r * rgb2float, color.g * rgb2float, color.b * rgb2float, color.a * rgb2float );
    }
    
    obj.geometry.addAttribute("a_Color", new zen3d.BufferAttribute(new Float32Array(colors), 4));
}

AppUtils.getRandomArrayElement = function( array )
{
    return array[ Math.floor( Math.random() * array.length ) ];
}

AppUtils.pauseTweensOf = function( obj )
{
    let tweens = gsap.getTweensOf( obj );
    
    for ( let i = 0; i < tweens.length; i++ )
    {
        tweens[i].pause();
    }
}

Number.prototype.clamp = function( min, max ) 
{
  return Math.min( Math.max( this, min ), max );
};

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
AppUtils.shuffle = function( a )
{
    for ( let i = a.length - 1; i > 0; i-- )
    {
        const j = Math.floor( Math.random() * ( i + 1 ) );
        [ a[i], a[j]] = [a[j], a[i] ];
    }
    
    return a;
}

AppUtils.setMaterial = function( objects, materials, name )
{
    let material;
    let i = 0;
    
    for ( i = 0; i < materials.length; i++ )
    {
        if ( materials[i].name === name )
        {
            material = materials[i];
            break;
        }
    }
    
    if ( !material )
    {
        console.warn( "Material", name, "not found!" );
        return;
    }
    
    for ( i = 0; i < objects.length; i++ )
    {
        if( objects[i].material )
        {
            objects[i].material = material;
        }
    }
}

AppUtils.PT_Start = function()
{
    AppUtils.startTime = new Date().getTime();
}

AppUtils.PT_End = function()
{
    console.log( "elapsed time:", new Date().getTime() - AppUtils.startTime, "ms" );
}

AppUtils.setMouseChildren = function( root, enabled )
{
    let children = root.getElementsByTagName( "div" );
    let i = 0;
    
    for ( i = 0; i < children.length; i++ )
    {
        if ( enabled )
        {
            children[i].style.pointerEvents = "auto";
        }
        else
        {
            children[i].style.pointerEvents = "none";
        }
    }
}

AppUtils.destroyScene = function( node )
{
    if ( node.children )
    {
        while( node.children.length > 0 )
        {
            AppUtils.destroyScene( node.children[0] );
        }
    }
    
    if ( node.geometry )
    {
        node.geometry.dispose();
    }
    
    if ( node.material )
    {
        if ( node.material.diffuseMap ) node.material.diffuseMap.dispose();
        if ( node.material.normalMap ) node.material.normalMap.dispose();
        if ( node.material.aoMap ) node.material.aoMap.dispose();
        
        node.material.dispose();
    }
    
    if ( node.parent )
    {
        node.parent.remove( node );
    }
}