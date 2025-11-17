export const testConfig = {
    "name": "test",
    "mapSize": {
        "width": 30,
        "height": 20
    },
    "tileset": {
        "0": {
            "type": "walkable",
            "assetKey": "forest_tiles"
        },
        "1": {
            "type": "obstacle",
            "assetKey": "obstacle_tree"
        },
        "2": {
            "type": "bridge",
            "assetKey": "forest_tiles"
        },
        "3": {
            "type": "walkable_obstacle",
            "assetKey": "forest_tiles"
        }
    },
    "regions": [],
    "connections": [],
    "objects": [
        {
            "type": "player_start",
            "position": {
                "x": 2,
                "y": 7
            }
        },
        {
            "type": "player_start",
            "position": {
                "x": 2,
                "y": 9
            }
        },
        {
            "type": "player_start",
            "position": {
                "x": 2,
                "y": 8
            }
        }
    ]
};