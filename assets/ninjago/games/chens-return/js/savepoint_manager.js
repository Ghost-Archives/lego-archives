'use strict';



const SavepointManager = {};
SavepointManager.savepoint = {};


SavepointManager.createSavepoint = function()
{
    this.savepoint = 
    {
        time: 0,
        entities: []
    }
    
    let i;
    let entity;
    let data;    
    
    for ( i = 0; i < ECS.entities.length; i++ )
    {
        entity = ECS.entities[i];
        
        data = {};
        
        data.id =                       entity.id.valueOf();
        data.enabled =                  entity.enabled.valueOf();
        data.type =                     entity.type.valueOf();
        
        if ( entity.type !== ECS.TYPE.STAFF_SHOT )
        {
            if ( entity.display )
            {
                data.displayVisible =       entity.display.visible.valueOf();
                data.displayParent =        App.scene.getObjectByProperty( "uuid", entity.display.parent.uuid );
                data.displayPosition =      entity.display.position.clone();
                data.displayQuaternion =    new zen3d.Quaternion().copy( entity.display.quaternion );
                data.displayScale =         entity.display.scale.clone();
            };

            if ( entity.body )
            {
                data.bodyPosition =          entity.body.position.clone();
                data.bodyQuaternion =        entity.body.quaternion.clone();
                data.bodyCollisionResponse = entity.body.collisionResponse.valueOf();

                if ( entity.body.debugMesh )
                {
                    data.debugMeshMaterial = entity.body.shapes[0].debugMesh.material.uuid;
                }
            };

            if ( entity.attractCount )
            {
                data.attractCount =         entity.attractCount;
            };
        }

        this.savepoint.entities.push( data );
    };
};

SavepointManager.restoreSavepoint = function()
{
    let i;
    let entity;
    let data;
    
    for ( i = 0; i < this.savepoint.entities.length; i++ )
    {
        data = this.savepoint.entities[i];
        entity = ECS.entities[i];

        entity.enabled =                            data.enabled.valueOf();

        if ( data.displayVisible !== undefined )
        {
            entity.display.visible =                data.displayVisible.valueOf();
            
            entity.display.position.copy( data.displayPosition );
            entity.display.quaternion.copy( entity.display.quaternion );
            entity.display.scale.copy( data.displayScale );

            if ( entity.display.parent !== data.displayParent )
            {
                if ( data.displayParent !== undefined )
                {
                    data.displayParent.add( entity.display );
                }
            }
        }
        
        if ( data.body )
        {
            entity.body.position.copy( data.bodyPosition );
            entity.body.quaternion.copy( data.bodyQuaternion );
            entity.body.collisionResponse = data.bodyCollisionResponse;
        }
        
        if ( data.attractCount ) entity.attractCount = data.attractCount.valueOf();
        
        if ( entity.reset ) entity.reset();
    }
};